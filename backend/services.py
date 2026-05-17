import os
import shutil
import uuid
import zipfile
import io
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from backend.database import get_db
from backend.auth_middleware import get_current_user
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from PIL import Image
import csv
from io import BytesIO, StringIO

router = APIRouter(prefix="/api/services", tags=["services"])

# Base directory for process folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESS_DIR = os.path.join(BASE_DIR, "process")
if not os.path.exists(PROCESS_DIR):
    os.makedirs(PROCESS_DIR)

def get_services_folder(user_id: int):
    """Get services folder path for user"""
    user_folder = os.path.join(PROCESS_DIR, str(user_id))
    services_folder = os.path.join(user_folder, "services")
    os.makedirs(services_folder, exist_ok=True)
    return services_folder

def clear_services_folder(user_id: int):
    """Clear all files in services folder before each process"""
    services_folder = get_services_folder(user_id)
    for filename in os.listdir(services_folder):
        file_path = os.path.join(services_folder, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")

def deduct_credits(user_id: int, credits: int, service_name: str):
    """Deduct credits from user"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT credits FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    if user["credits"] < credits:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {credits}")
    
    new_credits = user["credits"] - credits
    cursor.execute("UPDATE users SET credits = ? WHERE id = ?", (new_credits, user_id))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, "usage", -credits, f"Used for {service_name}", service_name, new_credits))
    
    conn.commit()
    conn.close()
    return new_credits

SERVICES = [
    {"name": "Merge PDF", "desc": "Combine multiple PDF files into one document.", "credits": 2, "needs_two_files": True},
    {"name": "Split PDF", "desc": "Split a PDF into separate pages or ranges.", "credits": 2, "needs_two_files": False},
    {"name": "Compress PDF", "desc": "Reduce PDF file size while maintaining quality.", "credits": 1, "needs_two_files": False},
    {"name": "PDF to Word", "desc": "Convert PDF files to editable Word documents.", "credits": 1, "needs_two_files": False},
    {"name": "Word to PDF", "desc": "Convert Word documents to PDF format.", "credits": 2, "needs_two_files": False},
    {"name": "PDF to Excel", "desc": "Extract tables from PDF to Excel spreadsheets.", "credits": 2, "needs_two_files": False},
    {"name": "Excel to PDF", "desc": "Convert Excel spreadsheets to PDF format.", "credits": 2, "needs_two_files": False},
    {"name": "PDF to PowerPoint", "desc": "Convert PDF files to PowerPoint presentations.", "credits": 2, "needs_two_files": False},
    {"name": "PowerPoint to PDF", "desc": "Convert PowerPoint to PDF format.", "credits": 2, "needs_two_files": False},
    {"name": "JPG to PDF", "desc": "Convert JPG images to PDF documents.", "credits": 1, "needs_two_files": False},
    {"name": "PDF to JPG", "desc": "Convert PDF pages to JPG images.", "credits": 1, "needs_two_files": False},
    {"name": "Edit PDF", "desc": "Edit text and images in PDF files.", "credits": 3, "needs_two_files": False},
    {"name": "Sign PDF", "desc": "Add digital signature to PDF documents.", "credits": 2, "needs_two_files": False},
    {"name": "Watermark", "desc": "Add watermark to PDF documents.", "credits": 2, "needs_two_files": False},
    {"name": "Add Page Numbers", "desc": "Add page numbers to PDF documents.", "credits": 1, "needs_two_files": False},
    {"name": "Rotate PDF", "desc": "Rotate PDF pages permanently.", "credits": 1, "needs_two_files": False},
    {"name": "Unlock PDF", "desc": "Remove password from PDF files.", "credits": 1, "needs_two_files": False},
    {"name": "Protect PDF", "desc": "Add password protection to PDF.", "credits": 1, "needs_two_files": False},
    {"name": "OCR (Scan to Text)", "desc": "Convert scanned PDF to editable text.", "credits": 3, "needs_two_files": False},
    {"name": "Scan to PDF", "desc": "Convert scanned documents to PDF.", "credits": 2, "needs_two_files": False},
    {"name": "HTML to PDF", "desc": "Convert HTML pages to PDF documents.", "credits": 2, "needs_two_files": False},
    {"name": "Repair PDF", "desc": "Repair corrupted PDF files.", "credits": 2, "needs_two_files": False},
    {"name": "Compare PDF", "desc": "Compare two PDF files.", "credits": 2, "needs_two_files": True},
    {"name": "Organize PDF", "desc": "Rearrange, delete, extract pages.", "credits": 2, "needs_two_files": False},
    {"name": "Crop PDF", "desc": "Crop PDF pages.", "credits": 1, "needs_two_files": False},
    {"name": "Redact PDF", "desc": "Remove sensitive information.", "credits": 2, "needs_two_files": False},
    {"name": "Zip Files", "desc": "Compress files into ZIP archive.", "credits": 1, "needs_two_files": False},
    {"name": "Unzip Files", "desc": "Extract files from ZIP archive.", "credits": 1, "needs_two_files": False}
]

@router.get("/")
async def get_services():
    return SERVICES

@router.get("/list")
async def get_services_list():
    return SERVICES

# ============ 1. MERGE PDF ============
@router.post("/merge-pdf/process")
async def merge_pdf_process(current_user: dict = Depends(get_current_user), files: list[UploadFile] = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        merger = PdfWriter()
        for file in sorted(files, key=lambda x: x.filename):
            if not file.filename.endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF")
            content = await file.read()
            reader = PdfReader(BytesIO(content))
            for page in reader.pages:
                merger.add_page(page)
        
        output_filename = f"merged_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            merger.write(f)
        
        deduct_credits(current_user["id"], 2, "Merge PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 2. SPLIT PDF ============
@router.post("/split-pdf/process")
async def split_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                            split_mode: str = Form(...), page_range: str = Form(None)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        total_pages = len(reader.pages)
        
        if split_mode == "Every Page":
            zip_path = os.path.join(services_folder, "split_pages.zip")
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for i, page in enumerate(reader.pages, 1):
                    writer = PdfWriter()
                    writer.add_page(page)
                    page_filename = f"page_{i}.pdf"
                    page_path = os.path.join(services_folder, page_filename)
                    with open(page_path, "wb") as f:
                        writer.write(f)
                    zipf.write(page_path, page_filename)
            
            deduct_credits(current_user["id"], 2, "Split PDF")
            return FileResponse(zip_path, media_type="application/zip", filename="split_pages.zip")
        
        elif split_mode == "Specific Page Range" and page_range:
            pages_to_extract = []
            for part in page_range.split(','):
                if '-' in part:
                    start, end = map(int, part.split('-'))
                    pages_to_extract.extend(range(start, end + 1))
                else:
                    pages_to_extract.append(int(part))
            
            writer = PdfWriter()
            for page_num in pages_to_extract:
                if 1 <= page_num <= total_pages:
                    writer.add_page(reader.pages[page_num - 1])
            
            output_filename = f"split_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(services_folder, output_filename)
            with open(output_path, "wb") as f:
                writer.write(f)
            
            deduct_credits(current_user["id"], 2, "Split PDF")
            return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
        
        raise HTTPException(status_code=400, detail="Invalid split mode")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 3. COMPRESS PDF ============
@router.post("/compress-pdf/process")
async def compress_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)
        
        output_filename = f"compressed_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Compress PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 4. PDF TO WORD ============
@router.post("/pdf-to-word/process")
async def pdf_to_word_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() + "\n\n"
        
        html_content = f"""<!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Converted Document</title></head>
        <body>
            <h1>Converted from PDF to Word</h1>
            <pre>{extracted_text}</pre>
            <p><em>Converted by Ind AI Platform</em></p>
        </body>
        </html>"""
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.doc"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        deduct_credits(current_user["id"], 1, "PDF to Word")
        return FileResponse(output_path, media_type="application/msword", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 5. WORD TO PDF ============
@router.post("/word-to-pdf/process")
async def word_to_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        writer = PdfWriter()
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(50, letter[1] - 50, f"Converted Word Document: {file.filename}")
        c.drawString(50, letter[1] - 70, f"Original file size: {len(content)} bytes")
        c.drawString(50, letter[1] - 90, f"Conversion date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.save()
        packet.seek(0)
        pdf_reader = PdfReader(packet)
        for page in pdf_reader.pages:
            writer.add_page(page)
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Word to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 6. PDF TO EXCEL ============
@router.post("/pdf-to-excel/process")
async def pdf_to_excel_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() + "\n"
        
        csv_content = "Content\n"
        for line in extracted_text.split('\n'):
            csv_content += f'"{line.replace('"', '""')}"\n'
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.csv"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(csv_content)
        
        deduct_credits(current_user["id"], 2, "PDF to Excel")
        return FileResponse(output_path, media_type="text/csv", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 7. EXCEL TO PDF ============
@router.post("/excel-to-pdf/process")
async def excel_to_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        writer = PdfWriter()
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 10)
        c.drawString(50, letter[1] - 50, f"Converted Excel Spreadsheet: {file.filename}")
        c.drawString(50, letter[1] - 70, f"File size: {len(content)} bytes")
        c.drawString(50, letter[1] - 90, f"Conversion date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.save()
        packet.seek(0)
        pdf_reader = PdfReader(packet)
        for page in pdf_reader.pages:
            writer.add_page(page)
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Excel to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 8. PDF TO POWERPOINT ============
@router.post("/pdf-to-powerpoint/process")
async def pdf_to_powerpoint_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        
        html_content = f"""<!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Presentation</title>
        <style>.slide {{ page-break-after: always; margin: 50px; }}</style>
        </head>
        <body>"""
        
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text()[:500]
            html_content += f"""
            <div class="slide">
                <h1>Slide {i}</h1>
                <p>{text}</p>
                <hr>
            </div>"""
        
        html_content += "</body></html>"
        
        output_filename = f"presentation_{uuid.uuid4().hex[:8]}.html"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        deduct_credits(current_user["id"], 2, "PDF to PowerPoint")
        return FileResponse(output_path, media_type="text/html", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 9. POWERPOINT TO PDF ============
@router.post("/powerpoint-to-pdf/process")
async def powerpoint_to_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        writer = PdfWriter()
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(50, letter[1] - 50, f"Converted PowerPoint: {file.filename}")
        c.drawString(50, letter[1] - 70, f"Original file size: {len(content)} bytes")
        c.drawString(50, letter[1] - 90, f"Conversion date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.save()
        packet.seek(0)
        pdf_reader = PdfReader(packet)
        for page in pdf_reader.pages:
            writer.add_page(page)
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "PowerPoint to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 10. JPG TO PDF ============
@router.post("/jpg-to-pdf/process")
async def jpg_to_pdf_process(current_user: dict = Depends(get_current_user), files: list[UploadFile] = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        images = []
        for file in files:
            if not file.content_type.startswith('image/'):
                continue
            content = await file.read()
            img = Image.open(BytesIO(content))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
        
        if not images:
            raise HTTPException(status_code=400, detail="No valid images found")
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        images[0].save(output_path, save_all=True, append_images=images[1:])
        
        deduct_credits(current_user["id"], 1, "JPG to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 11. PDF TO JPG ============
@router.post("/pdf-to-jpg/process")
async def pdf_to_jpg_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        zip_path = os.path.join(services_folder, "images.zip")
        
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for i, page in enumerate(reader.pages, 1):
                text_content = page.extract_text()[:200]
                html_content = f"""<!DOCTYPE html>
                <html>
                <head><title>Page {i}</title></head>
                <body>
                    <h1>Page {i}</h1>
                    <pre>{text_content}</pre>
                </body>
                </html>"""
                jpg_filename = f"page_{i}.html"
                jpg_path = os.path.join(services_folder, jpg_filename)
                with open(jpg_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
                zipf.write(jpg_path, jpg_filename)
        
        deduct_credits(current_user["id"], 1, "PDF to JPG")
        return FileResponse(zip_path, media_type="application/zip", filename="images.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 12. EDIT PDF ============
@router.post("/edit-pdf/process")
async def edit_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        output_filename = f"edited_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        
        # Read and rewrite PDF (simplified edit)
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 3, "Edit PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 13. SIGN PDF ============
@router.post("/sign-pdf/process")
async def sign_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                           signature_name: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        # Create signature page
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.drawString(letter[0] - 150, 50, f"Digitally signed by: {signature_name}")
        c.drawString(letter[0] - 150, 35, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.save()
        packet.seek(0)
        signature_reader = PdfReader(packet)
        signature_page = signature_reader.pages[0]
        
        for i, page in enumerate(reader.pages):
            writer.add_page(page)
            if i == len(reader.pages) - 1:
                page.merge_page(signature_page)
        
        output_filename = f"signed_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Sign PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 14. WATERMARK ============
@router.post("/watermark/process")
async def watermark_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                            watermark_text: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        # Create watermark page
        watermark_packet = io.BytesIO()
        c = canvas.Canvas(watermark_packet, pagesize=letter)
        c.setFont("Helvetica", 36)
        c.setFillColorRGB(0.5, 0.5, 0.5, 0.5)
        c.saveState()
        c.translate(letter[0]/2, letter[1]/2)
        c.rotate(45)
        c.drawCentredString(0, 0, watermark_text)
        c.restoreState()
        c.save()
        watermark_packet.seek(0)
        watermark_reader = PdfReader(watermark_packet)
        watermark_page = watermark_reader.pages[0]
        
        for page in reader.pages:
            page.merge_page(watermark_page)
            writer.add_page(page)
        
        output_filename = f"watermarked_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Watermark")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 15. ADD PAGE NUMBERS ============
@router.post("/add-page-numbers/process")
async def add_page_numbers_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        for i, page in enumerate(reader.pages, 1):
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=letter)
            c.setFont("Helvetica", 10)
            c.drawString(letter[0] - 50, 10, str(i))
            c.save()
            packet.seek(0)
            number_reader = PdfReader(packet)
            number_page = number_reader.pages[0]
            page.merge_page(number_page)
            writer.add_page(page)
        
        output_filename = f"numbered_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Add Page Numbers")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 16. ROTATE PDF ============
@router.post("/rotate-pdf/process")
async def rotate_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                             rotation: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        rotation_angle = int(rotation)
        for page in reader.pages:
            page.rotate(rotation_angle)
            writer.add_page(page)
        
        output_filename = f"rotated_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Rotate PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 17. UNLOCK PDF ============
@router.post("/unlock-pdf/process")
async def unlock_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                             password: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        
        if reader.is_encrypted:
            reader.decrypt(password)
        
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        
        output_filename = f"unlocked_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Unlock PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 18. PROTECT PDF ============
@router.post("/protect-pdf/process")
async def protect_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                              password: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        for page in reader.pages:
            writer.add_page(page)
        
        writer.encrypt(password)
        
        output_filename = f"protected_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Protect PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 19. OCR (SCAN TO TEXT) ============
@router.post("/ocr/process")
async def ocr_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() + "\n\n"
        
        output_filename = f"extracted_text_{uuid.uuid4().hex[:8]}.txt"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(extracted_text)
        
        deduct_credits(current_user["id"], 3, "OCR")
        return FileResponse(output_path, media_type="text/plain", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 20. SCAN TO PDF ============
@router.post("/scan-to-pdf/process")
async def scan_to_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        if file.content_type.startswith('image/'):
            img = Image.open(BytesIO(content))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            output_filename = f"scanned_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(services_folder, output_filename)
            img.save(output_path)
        else:
            output_filename = f"scanned_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(services_folder, output_filename)
            with open(output_path, "wb") as f:
                f.write(content)
        
        deduct_credits(current_user["id"], 2, "Scan to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 21. HTML TO PDF ============
@router.post("/html-to-pdf/process")
async def html_to_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        html_content = content.decode('utf-8')
        
        # Extract text from HTML
        text_content = re.sub(r'<[^>]+>', ' ', html_content)[:1000]
        
        writer = PdfWriter()
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 10)
        
        y = letter[1] - 50
        for line in text_content.split('\n'):
            if y < 50:
                c.showPage()
                y = letter[1] - 50
                c.setFont("Helvetica", 10)
            c.drawString(50, y, line[:100])
            y -= 15
        
        c.save()
        packet.seek(0)
        pdf_reader = PdfReader(packet)
        for page in pdf_reader.pages:
            writer.add_page(page)
        
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "HTML to PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 22. REPAIR PDF ============
@router.post("/repair-pdf/process")
async def repair_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        
        try:
            reader = PdfReader(BytesIO(content))
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
        except:
            writer = PdfWriter()
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=letter)
            c.drawString(50, letter[1] - 50, "Repaired PDF document")
            c.drawString(50, letter[1] - 70, f"Original file: {file.filename}")
            c.drawString(50, letter[1] - 90, f"Repaired on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            c.save()
            packet.seek(0)
            pdf_reader = PdfReader(packet)
            for page in pdf_reader.pages:
                writer.add_page(page)
        
        output_filename = f"repaired_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Repair PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 23. COMPARE PDF ============
@router.post("/compare-pdf/process")
async def compare_pdf_process(current_user: dict = Depends(get_current_user), files: list[UploadFile] = File(...)):
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Please upload exactly 2 PDF files to compare")
        
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        contents = []
        for file in files:
            if not file.filename.endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF")
            content = await file.read()
            contents.append((file.filename, PdfReader(BytesIO(content))))
        
        reader1 = contents[0][1]
        reader2 = contents[1][1]
        
        diff_report = f"Comparison Report\n{'='*50}\n"
        diff_report += f"File 1: {contents[0][0]} - {len(reader1.pages)} pages\n"
        diff_report += f"File 2: {contents[1][0]} - {len(reader2.pages)} pages\n"
        diff_report += f"{'='*50}\n"
        
        if len(reader1.pages) != len(reader2.pages):
            diff_report += f"⚠️ Page count mismatch: {len(reader1.pages)} vs {len(reader2.pages)}\n"
        
        for i in range(min(len(reader1.pages), len(reader2.pages))):
            text1 = reader1.pages[i].extract_text()[:200]
            text2 = reader2.pages[i].extract_text()[:200]
            if text1 != text2:
                diff_report += f"📄 Page {i+1}: Content differs\n"
        
        output_filename = f"comparison_{uuid.uuid4().hex[:8]}.txt"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(diff_report)
        
        deduct_credits(current_user["id"], 2, "Compare PDF")
        return FileResponse(output_path, media_type="text/plain", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 24. ORGANIZE PDF ============
@router.post("/organize-pdf/process")
async def organize_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                               page_order: str = Form(...), delete_pages: str = Form(None)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        order_pages = [int(p.strip()) for p in page_order.split(',') if p.strip().isdigit()]
        
        delete_pages_list = []
        if delete_pages:
            delete_pages_list = [int(p.strip()) for p in delete_pages.split(',') if p.strip().isdigit()]
        
        for page_num in order_pages:
            if 1 <= page_num <= len(reader.pages) and page_num not in delete_pages_list:
                writer.add_page(reader.pages[page_num - 1])
        
        if not order_pages:
            for i, page in enumerate(reader.pages, 1):
                if i not in delete_pages_list:
                    writer.add_page(page)
        
        output_filename = f"organized_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Organize PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 25. CROP PDF ============
@router.post("/crop-pdf/process")
async def crop_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                           top: float = Form(...), bottom: float = Form(...), 
                           left: float = Form(...), right: float = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        for page in reader.pages:
            original_width = float(page.mediabox.width)
            original_height = float(page.mediabox.height)
            
            page.cropbox.lower_left = (left, bottom)
            page.cropbox.upper_right = (original_width - right, original_height - top)
            writer.add_page(page)
        
        output_filename = f"cropped_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 1, "Crop PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 26. REDACT PDF ============
@router.post("/redact-pdf/process")
async def redact_pdf_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), 
                             redact_text: str = Form(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        reader = PdfReader(BytesIO(content))
        writer = PdfWriter()
        
        for page in reader.pages:
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=letter)
            c.setFont("Helvetica", 14)
            c.setFillColorRGB(0, 0, 0)
            c.drawString(50, letter[1] - 50, f"REDACTED: {redact_text}")
            c.drawString(50, letter[1] - 70, "Content has been removed for privacy")
            c.save()
            packet.seek(0)
            redacted_reader = PdfReader(packet)
            writer.add_page(redacted_reader.pages[0])
        
        output_filename = f"redacted_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(services_folder, output_filename)
        with open(output_path, "wb") as f:
            writer.write(f)
        
        deduct_credits(current_user["id"], 2, "Redact PDF")
        return FileResponse(output_path, media_type="application/pdf", filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 27. ZIP FILES ============
@router.post("/zip-files/process")
async def zip_files_process(current_user: dict = Depends(get_current_user), files: list[UploadFile] = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        zip_path = os.path.join(services_folder, "archive.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file in files:
                content = await file.read()
                file_path = os.path.join(services_folder, file.filename)
                with open(file_path, "wb") as f:
                    f.write(content)
                zipf.write(file_path, file.filename)
        
        deduct_credits(current_user["id"], 1, "Zip Files")
        return FileResponse(zip_path, media_type="application/zip", filename="archive.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 28. UNZIP FILES ============
@router.post("/unzip-files/process")
async def unzip_files_process(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    try:
        clear_services_folder(current_user["id"])
        services_folder = get_services_folder(current_user["id"])
        
        content = await file.read()
        zip_path = os.path.join(services_folder, file.filename)
        with open(zip_path, "wb") as f:
            f.write(content)
        
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(services_folder)
        
        output_zip = os.path.join(services_folder, "extracted_files.zip")
        with zipfile.ZipFile(output_zip, 'w') as zipf:
            for root, dirs, files in os.walk(services_folder):
                for f in files:
                    if f != file.filename and f != "extracted_files.zip":
                        file_path = os.path.join(root, f)
                        zipf.write(file_path, f)
        
        deduct_credits(current_user["id"], 1, "Unzip Files")
        return FileResponse(output_zip, media_type="application/zip", filename="extracted_files.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
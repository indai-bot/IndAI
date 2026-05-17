import sqlite3
import pandas as pd
import os
from datetime import datetime

# Database path
DB_PATH = "indai.db"
OUTPUT_FILE = f"indai_database_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

def get_all_tables():
    """Get all table names from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()
    conn.close()
    return [table[0] for table in tables]

def export_to_excel():
    """Export all tables to separate sheets in Excel"""
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file '{DB_PATH}' not found!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    tables = get_all_tables()
    
    if not tables:
        print("No tables found in database!")
        conn.close()
        return
    
    print(f"Found {len(tables)} tables: {', '.join(tables)}")
    
    # Create Excel writer
    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        
        for table in tables:
            print(f"Exporting table: {table}...")
            
            # Read table into DataFrame
            df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
            
            # Write to sheet
            sheet_name = table[:31]  # Excel sheet name max 31 characters
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets[sheet_name]
            for column in df:
                column_width = max(df[column].astype(str).map(len).max(), len(column)) + 2
                worksheet.column_dimensions[column].width = min(column_width, 50)
    
    conn.close()
    
    print(f"\n✅ Export complete!")
    print(f"📁 File saved as: {OUTPUT_FILE}")
    print(f"📊 Total tables exported: {len(tables)}")
    
    # File size
    file_size = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"📦 File size: {file_size:.2f} KB")

def export_table_to_csv(table_name):
    """Export a single table to CSV"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
    csv_file = f"{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df.to_csv(csv_file, index=False)
    conn.close()
    print(f"✅ Exported {table_name} to {csv_file}")
    return csv_file

def show_table_preview(table_name, rows=5):
    """Show preview of a table"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(f"SELECT * FROM {table_name} LIMIT {rows}", conn)
    conn.close()
    print(f"\n📋 Preview of {table_name} table:")
    print(df.to_string())
    return df

if __name__ == "__main__":
    print("=" * 50)
    print("📊 IND AI DATABASE EXPORTER")
    print("=" * 50)
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Database file '{DB_PATH}' not found!")
        print("Make sure you're running this script from the correct directory.")
        exit(1)
    
    # Show all tables
    tables = get_all_tables()
    print(f"\n📋 Tables found in database:")
    for i, table in enumerate(tables, 1):
        # Get row count
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        conn.close()
        print(f"   {i}. {table} ({count} rows)")
    
    print("\n" + "=" * 50)
    
    # Ask user what to do
    print("\nOptions:")
    print("1. Export ALL tables to Excel (separate sheets)")
    print("2. Export specific table to CSV")
    print("3. Preview a table")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        export_to_excel()
        
    elif choice == "2":
        print("\nAvailable tables:")
        for i, table in enumerate(tables, 1):
            print(f"   {i}. {table}")
        table_choice = input("Enter table name or number: ").strip()
        
        if table_choice.isdigit():
            idx = int(table_choice) - 1
            if 0 <= idx < len(tables):
                table_name = tables[idx]
            else:
                table_name = table_choice
        else:
            table_name = table_choice
        
        if table_name in tables:
            export_table_to_csv(table_name)
        else:
            print(f"❌ Table '{table_name}' not found!")
            
    elif choice == "3":
        print("\nAvailable tables:")
        for i, table in enumerate(tables, 1):
            print(f"   {i}. {table}")
        table_choice = input("Enter table name or number: ").strip()
        
        if table_choice.isdigit():
            idx = int(table_choice) - 1
            if 0 <= idx < len(tables):
                table_name = tables[idx]
            else:
                table_name = table_choice
        else:
            table_name = table_choice
        
        if table_name in tables:
            rows = input("Number of rows to preview (default 5): ").strip()
            rows = int(rows) if rows.isdigit() else 5
            show_table_preview(table_name, rows)
        else:
            print(f"❌ Table '{table_name}' not found!")
    
    else:
        print("Exiting...")
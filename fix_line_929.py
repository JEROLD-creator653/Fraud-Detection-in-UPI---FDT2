"""Quick fix script to update line 929 in app/main.py"""
import sys

file_path = r'c:\Users\jerol\SEC\FDT\app\main.py'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 929 (index 928)
if len(lines) > 928:
    original = lines[928]
    if 'row[0] if row else None' in original:
        lines[928] = original.replace('row[0]', 'row["log_id"]')
        print(f"Fixed line 929:")
        print(f"  OLD: {original.strip()}")
        print(f"  NEW: {lines[928].strip()}")
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("\n✓ File updated successfully!")
    else:
        print("Line 929 doesn't contain expected code - already fixed or file changed")
else:
    print("File has fewer than 929 lines")

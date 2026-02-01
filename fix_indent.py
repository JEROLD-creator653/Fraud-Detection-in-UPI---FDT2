# Read the file
with open(r'C:\Users\jerol\SEC\FDT\app\main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 1011 and 1012 (0-indexed: 1010, 1011)
if len(lines) > 1012:
    # Remove leading spaces/tabs and add correct indentation (8 spaces based on surrounding code)
    lines[1010] = '        preset_id = result[\'id\'] if result else None\n'
    lines[1011] = '        print(f"DEBUG db_save: result={result}, preset_id={preset_id}")\n'
    
    # Write back
    with open(r'C:\Users\jerol\SEC\FDT\app\main.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("Fixed indentation on lines 1011-1012")
else:
    print(f"File has only {len(lines)} lines")

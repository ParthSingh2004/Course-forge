
import sys

file_path = r'c:\Users\parth\Desktop\CourseForge\courseforge-frontend\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    if (type === 'flashcard') {
      newBlock.front = '';
      newBlock.back = '';
    }"""

replacement = """    if (type === 'flashcard') {
      newBlock.front = '';
      newBlock.back = '';
    }
    if (type === 'statement') {
      newBlock.content = "";
      newBlock.image = null;
      newBlock.textPosition = 'bottom';
      newBlock.textAlign = 'left';
      newBlock.overlay = 0.35;
      newBlock.imageHeight = '380px';
    }"""

# Try to find target regardless of line endings
if target in content:
    new_content = content.replace(target, replacement)
else:
    # Try with CRLF
    target_crlf = target.replace('\n', '\r\n')
    replacement_crlf = replacement.replace('\n', '\r\n')
    if target_crlf in content:
        new_content = content.replace(target_crlf, replacement_crlf)
    else:
        print("Target not found")
        sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement successful")

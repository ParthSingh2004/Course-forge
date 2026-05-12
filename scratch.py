with open('courseforge-frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "case 'columns': {" in line:
        start_idx = i
    if "case 'audio':" in line:
        end_idx = i
        break

print(f'Start: {start_idx}, End: {end_idx}')

import_stmt = "import ColumnsGridBlock from './components/blocks/ColumnsGridBlock';\n"
lines.insert(4, import_stmt)

start_idx += 1
end_idx += 1

replacement = "      case 'columns':\n        return <ColumnsGridBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;\n"
lines = lines[:start_idx] + [replacement] + lines[end_idx:]

with open('courseforge-frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

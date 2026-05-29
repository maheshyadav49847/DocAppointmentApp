import re

file_path = 'BranchesPage.tsx'
css_path = 'BranchesPage.css'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

style_regex = re.compile(r'style=\{\{([^}]+)\}\}')
styles = []
class_counter = 1

def replace_style(match):
    global class_counter
    style_content = match.group(1).strip()
    
    if '?' in style_content or 'branch.' in style_content or 'error' in style_content:
        return match.group(0)
    
    class_name = f'branch-style-{class_counter}'
    class_counter += 1
    
    # parse simple JS object style
    # split by comma, but not if inside parentheses or quotes
    props = []
    current_prop = ""
    in_paren = 0
    in_quote = False
    quote_char = ''
    
    for char in style_content:
        if char in ('\'', '"', ''):
            if not in_quote:
                in_quote = True
                quote_char = char
            elif quote_char == char:
                in_quote = False
        elif char == '(':
            in_paren += 1
        elif char == ')':
            in_paren -= 1
        elif char == ',' and not in_quote and in_paren == 0:
            props.append(current_prop)
            current_prop = ""
            continue
        
        current_prop += char
        
    if current_prop:
        props.append(current_prop)
    
    css_rules = []
    for prop in props:
        if ':' not in prop:
            continue
        key, val = prop.split(':', 1)
        key = key.strip()
        val = val.strip().strip("'").strip('"')
        
        # kebab case
        key = re.sub(r'(?<!^)(?=[A-Z])', '-', key).lower()
        css_rules.append(f'  {key}: {val};')
    
    css_block = f'.{class_name} {{\n' + '\n'.join(css_rules) + '\n}\n'
    styles.append(css_block)
    
    return f'className="{class_name}"'

new_content = style_regex.sub(replace_style, content)

if 'import \'./BranchesPage.css\';' not in new_content:
    new_content = new_content.replace('import React', 'import React\nimport \'./BranchesPage.css\';', 1)
    
new_content = re.sub(r'className="([^"]+)"\s+className="([^"]+)"', r'className="\1 \2"', new_content)

# Fix the import bug where we replace 'import React, { useState }' wrongly if we match just 'import React'
# Instead, explicitly replace just the string "import React, { useState, useEffect } from 'react';"
with open(file_path, 'r', encoding='utf-8') as f:
    orig_content = f.read()

new_content = style_regex.sub(replace_style, orig_content)

# Better import injection
import_line = "import './BranchesPage.css';\n"
if "import './BranchesPage.css';" not in new_content:
    lines = new_content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('import '):
            lines.insert(i + 1, "import './BranchesPage.css';")
            break
    new_content = '\n'.join(lines)

new_content = re.sub(r'className="([^"]+)"\s+className="([^"]+)"', r'className="\1 \2"', new_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(styles))
    
print(f"Extracted {len(styles)} styles")

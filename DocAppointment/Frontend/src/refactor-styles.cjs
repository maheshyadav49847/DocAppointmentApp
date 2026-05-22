const fs = require('fs');
const path = require('path');

function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

function processFile(filePath, cssFilePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let cssContent = fs.existsSync(cssFilePath) ? fs.readFileSync(cssFilePath, 'utf8') : '';
  
  const styleRegex = /style=\{\{([^}]+)\}\}/g;
  let match;
  const newClasses = new Map();
  let counter = 1;

  content = content.replace(styleRegex, (original, styleStr) => {
    // Basic parse of object
    const props = styleStr.split(',').map(p => p.trim()).filter(Boolean);
    let classProps = [];
    let nameParts = [];
    
    for (let p of props) {
      let [key, val] = p.split(':').map(s => s.trim());
      if (!key || !val) continue;
      key = key.replace(/['"]/g, '');
      val = val.replace(/['"]/g, '');
      
      // Handle conditional properties (ternary), skip them for now
      if (val.includes('?')) {
         return original;
      }
      
      const kebabKey = camelToKebab(key);
      classProps.push(`  ${kebabKey}: ${val};`);
      
      // build a heuristic name
      if (kebabKey === 'display' && val === 'flex') nameParts.push('flex');
      else if (kebabKey === 'align-items') nameParts.push('items-' + val);
      else if (kebabKey === 'justify-content') nameParts.push('justify-' + val);
      else if (kebabKey === 'margin-right') nameParts.push('mr-' + val.replace(/px|rem|em|%/g, ''));
      else if (kebabKey === 'margin-left') nameParts.push('ml-' + val.replace(/px|rem|em|%/g, ''));
      else if (kebabKey === 'margin-top') nameParts.push('mt-' + val.replace(/px|rem|em|%/g, ''));
      else if (kebabKey === 'color') nameParts.push('color-' + val.replace('#', ''));
      else if (kebabKey === 'font-size') nameParts.push('fs-' + val.replace(/px|rem|em|%/g, ''));
    }
    
    if (classProps.length === 0) return original;
    
    let baseName = nameParts.length > 0 ? nameParts.join('-') : 'custom-style';
    baseName = baseName.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let className = baseName;
    
    const cssBody = `{\n${classProps.join('\n')}\n}`;
    
    let existingClass = null;
    for (let [cls, body] of newClasses.entries()) {
      if (body === cssBody) {
        existingClass = cls;
        break;
      }
    }
    
    if (existingClass) {
      className = existingClass;
    } else {
      let tempName = className;
      let i = 1;
      while (newClasses.has(tempName) && newClasses.get(tempName) !== cssBody) {
        tempName = className + '-' + i;
        i++;
      }
      className = tempName;
      if (className === 'custom-style') {
          className = 'custom-style-' + counter++;
      }
      newClasses.set(className, cssBody);
    }
    
    return `__INLINE_STYLE__="${className}"`;
  });
  
  content = content.replace(/className=(['"])(.*?)\1\s+__INLINE_STYLE__=(['"])(.*?)\3/g, 'className="$2 $4"');
  content = content.replace(/__INLINE_STYLE__=(['"])(.*?)\1\s+className=(['"])(.*?)\3/g, 'className="$2 $4"');
  content = content.replace(/__INLINE_STYLE__=(['"])(.*?)\1/g, 'className="$2"');
  
  fs.writeFileSync(filePath, content);
  
  let appendedCss = '';
  for (let [cls, body] of newClasses.entries()) {
    appendedCss += `\n.${cls} ${body}\n`;
  }
  
  if (appendedCss) {
    fs.appendFileSync(cssFilePath, appendedCss);
  }
  
  console.log(`Processed ${filePath}: extracted ${newClasses.size} unique styles.`);
}

const basePath = 'C:/Users/HP/.gemini/antigravity/worktrees/DocAppointmentApp/greeting-implementation-test/DocAppointment/Frontend/src';
processFile(path.join(basePath, 'features/patients/components/PatientsList.tsx'), path.join(basePath, 'features/patients/components/PatientsList.css'));
processFile(path.join(basePath, 'features/patients/components/AddPatientModal.tsx'), path.join(basePath, 'features/patients/components/PatientsList.css'));

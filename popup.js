// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    button.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Load saved data when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(null);
  
  // Load basic fields
  const fields = ['fullName', 'email', 'phone', 'university', 'department', 'cgpa', 'graduationYear', 'address', 'linkedIn', 'github'];
  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element && data[field]) {
      element.value = data[field];
    }
  });
  
  // Load custom fields
  if (data.customFields) {
    data.customFields.forEach((field, index) => {
      addCustomFieldUI(field.name, field.value, index);
    });
  }
});

// Save form data
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    university: document.getElementById('university').value,
    department: document.getElementById('department').value,
    cgpa: document.getElementById('cgpa').value,
    graduationYear: document.getElementById('graduationYear').value,
    address: document.getElementById('address').value,
    linkedIn: document.getElementById('linkedIn').value,
    github: document.getElementById('github').value,
    customFields: []
  };
  
  // Collect custom fields
  document.querySelectorAll('.custom-field').forEach(fieldDiv => {
    const nameInput = fieldDiv.querySelector('.custom-field-name');
    const valueInput = fieldDiv.querySelector('.custom-field-value');
    if (nameInput && valueInput && nameInput.value && valueInput.value) {
      data.customFields.push({
        name: nameInput.value,
        value: valueInput.value
      });
    }
  });
  
  await chrome.storage.local.set(data);
  
  showStatus('saveStatus', 'Settings saved successfully!', 'success');
});

// Fill form button
document.getElementById('fillForm').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fillFormFields
    });
    
    showStatus('fillStatus', 'Form filled successfully!', 'success');
  } catch (error) {
    showStatus('fillStatus', 'Error filling form: ' + error.message, 'error');
  }
});

// Add custom field
let customFieldIndex = 0;
document.getElementById('addField').addEventListener('click', () => {
  addCustomFieldUI('', '', customFieldIndex++);
});

function addCustomFieldUI(name = '', value = '', index) {
  const customFieldsDiv = document.getElementById('customFields');
  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'custom-field';
  fieldDiv.innerHTML = `
    <button type="button" class="remove-field">×</button>
    <div class="form-group">
      <label>Field Name:</label>
      <input type="text" class="custom-field-name" placeholder="e.g., Skills" value="${name}">
    </div>
    <div class="form-group">
      <label>Field Value:</label>
      <input type="text" class="custom-field-value" placeholder="e.g., JavaScript, Python" value="${value}">
    </div>
  `;
  
  fieldDiv.querySelector('.remove-field').addEventListener('click', () => {
    fieldDiv.remove();
  });
  
  customFieldsDiv.appendChild(fieldDiv);
}

function showStatus(elementId, message, type) {
  const statusDiv = document.getElementById(elementId);
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// This function will be injected into the page
async function fillFormFields() {
  const data = await chrome.storage.local.get(null);
  
  // Field mapping with variations
  const fieldMappings = {
    fullName: ['full name', 'name', 'your name', 'full_name', 'fullname', 'applicant name', 'candidate name'],
    email: ['email', 'e-mail', 'email address', 'e mail', 'mail', 'your email'],
    phone: ['phone', 'telephone', 'mobile', 'phone number', 'contact', 'contact number', 'mobile number', 'cell'],
    university: ['university', 'college', 'institution', 'school', 'university name', 'alma mater', 'educational institution'],
    department: ['department', 'major', 'field of study', 'program', 'degree', 'subject', 'specialization', 'dept', 'discipline'],
    cgpa: ['cgpa', 'gpa', 'grade', 'marks', 'score', 'cumulative gpa', 'academic score'],
    graduationYear: ['graduation', 'year', 'graduation year', 'passing year', 'completion year', 'grad year', 'year of graduation'],
    address: ['address', 'location', 'residence', 'home address', 'full address', 'street address', 'residential address'],
    linkedIn: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
    github: ['github', 'git hub', 'github profile', 'github url']
  };
  
  // Add custom fields to mappings
  if (data.customFields) {
    data.customFields.forEach(field => {
      fieldMappings[field.name] = [field.name.toLowerCase()];
    });
  }
  
  function normalizeText(text) {
    return text.toLowerCase()
      .replace(/[_\-\s]+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }
  
  function matchField(fieldText, mappings) {
    const normalized = normalizeText(fieldText);
    
    for (const [key, variations] of Object.entries(mappings)) {
      for (const variation of variations) {
        if (normalized.includes(variation) || variation.includes(normalized)) {
          return key;
        }
      }
    }
    return null;
  }
  
  function fillInput(input, value) {
    if (!value) return;
    
    // Set the value
    input.value = value;
    
    // Trigger all possible events
    const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
    events.forEach(eventType => {
      input.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
    
    // For React/Vue forms
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  let filledCount = 0;
  
  // Check if it's a Google Form
  const isGoogleForm = window.location.hostname.includes('docs.google.com') && window.location.pathname.includes('/forms');
  
  if (isGoogleForm) {
    console.log('Detected Google Form');
    
    // Google Forms specific selectors
    const googleInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea');
    
    googleInputs.forEach(input => {
      // Get the question text from Google Forms structure
      let questionText = '';
      
      // Try to find the question label
      const questionDiv = input.closest('[role="listitem"]') || input.closest('.Qr7Oae');
      if (questionDiv) {
        const labelElement = questionDiv.querySelector('[role="heading"]') || questionDiv.querySelector('.M7eMe');
        if (labelElement) {
          questionText = labelElement.textContent;
        }
      }
      
      // Also check aria-label
      if (!questionText && input.getAttribute('aria-label')) {
        questionText = input.getAttribute('aria-label');
      }
      
      if (questionText) {
        const fieldType = matchField(questionText, fieldMappings);
        
        if (fieldType) {
          if (data[fieldType]) {
            fillInput(input, data[fieldType]);
            filledCount++;
            console.log(`Filled ${fieldType}: ${data[fieldType]}`);
          } else if (data.customFields) {
            const customField = data.customFields.find(f => f.name === fieldType);
            if (customField) {
              fillInput(input, customField.value);
              filledCount++;
              console.log(`Filled custom field ${fieldType}: ${customField.value}`);
            }
          }
        }
      }
    });
  } else {
    // Regular forms (job portals, etc.)
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea');
    
    inputs.forEach(input => {
      let fieldType = null;
      
      // Check label
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        fieldType = matchField(label.textContent, fieldMappings);
      }
      
      // Check placeholder
      if (!fieldType && input.placeholder) {
        fieldType = matchField(input.placeholder, fieldMappings);
      }
      
      // Check name attribute
      if (!fieldType && input.name) {
        fieldType = matchField(input.name, fieldMappings);
      }
      
      // Check id attribute
      if (!fieldType && input.id) {
        fieldType = matchField(input.id, fieldMappings);
      }
      
      // Check aria-label
      if (!fieldType && input.getAttribute('aria-label')) {
        fieldType = matchField(input.getAttribute('aria-label'), fieldMappings);
      }
      
      // Fill the field if matched
      if (fieldType) {
        if (data[fieldType]) {
          fillInput(input, data[fieldType]);
          filledCount++;
          console.log(`Filled ${fieldType}: ${data[fieldType]}`);
        } else if (data.customFields) {
          const customField = data.customFields.find(f => f.name === fieldType);
          if (customField) {
            fillInput(input, customField.value);
            filledCount++;
            console.log(`Filled custom field ${fieldType}: ${customField.value}`);
          }
        }
      }
    });
  }
  
  console.log(`Form auto-fill completed! Filled ${filledCount} fields.`);
  return filledCount;
}
// A parser for Laminate Orientation Codes (LOCs)

export function validateLoc(loc) {
  const locRegex = /^[0-9 \-+s\[\]\(\)\{\}\<\>/\\]*$/;
  if (!locRegex.test(loc)) {
    return false;
  }

  // Check for matching brackets
  const bracketsValid = validateBrackets(loc);
  if (!bracketsValid) {
    return false;
  }

  return true;
}

export function parseLoc(loc) {
  const valid = validateLoc(loc);
  if (!valid) {
    return null;
  }

  // Split loc into tokens:
  const digitRegex = /^[0-9]$/;
  let tokens = [];
  let processingNumber = false;
  for (let i = 0; i < loc.length; i++) {
    const char = loc[i];

    const isDigit = digitRegex.test(char);

    if (isDigit) {
      if (processingNumber) {
        tokens[tokens.length - 1] += char;
      } else {
        processingNumber = true;
        tokens.push(char);
      }
    } else {
      if (processingNumber) {
        // Finish the previous number:
        processingNumber = false;
        tokens[tokens.length - 1] = parseInt(tokens[tokens.length - 1]); // TODO: Handle floats
      }

      if (char === '-' || char === '+') {
        // Start a new number:
        processingNumber = true;
        tokens.push(char);
        continue;
      }

      if (char === ' ' || char === '\\' || char === '/') {
        // These are just dividers between numbers, so ignore them:
        continue;
      }

      // Otherwise, it's a bracket:
      tokens.push(char);
    }
  }

  console.log(tokens);
}

function validateBrackets(text) {
  const bracketRegex = /[\[\]\(\)\{\}\<\>]/g;
  const brackets = text.match(bracketRegex);
  const opens = ['[', '(', '{', '<'];
  const openToCloseMap = {
    '[': ']',
    '(': ')',
    '{': '}',
    '<': '>'
  };
  const bracketStack = [];
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    if (opens.includes(bracket)) {
      bracketStack.push(bracket);
    } else if (bracketStack.length > 0 && openToCloseMap[bracketStack[bracketStack.length - 1]] === bracket) {
      bracketStack.pop();
    } else {
      return false;
    }
  }

  if (bracketStack.length > 0) {
    return false;
  }

  return true;
}
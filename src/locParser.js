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

  const tokens = tokenizeLoc(loc);

  const layup = tokensToCompleteLayup(tokens);

  return layup;
}

function tokensToCompleteLayup(tokens) {
  // Search for the first and last bracket. Because of the earlier validation, we know that they will match.
  const opensRegex = /^[\[\({<]$/;
  const closesRegex = /^[\]\)}>]$/;
  let firstBracketIndex = -1;
  let lastBracketIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (opensRegex.test(token)) {
      firstBracketIndex = i;
      break;
    }
  }
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (closesRegex.test(token)) {
      lastBracketIndex = i;
      break;
    }
  }

  // If there are no brackets, then the whole thing is a layup:
  if (firstBracketIndex === -1) {
    return tokens;
  }

  // Otherwise, recursively call this function on the contents of the brackets:
  const contents = tokens.slice(firstBracketIndex + 1, lastBracketIndex);
  const subLayup = tokensToCompleteLayup(contents);

  if (lastBracketIndex + 1 < tokens.length && tokens[lastBracketIndex + 1] === 's') {
    // If there is a 's' after the last bracket, then it's a symmetric layup, so we need to append a reversed copy of the sub-layup:
    const reversedSubLayup = [...subLayup].reverse();
    subLayup.push(...reversedSubLayup);
    lastBracketIndex++;
  }

  // Then, replace the contents of the brackets with the sub-layup:
  const newTokens = tokens.slice(0, firstBracketIndex);
  newTokens.push(...subLayup);
  newTokens.push(...tokens.slice(lastBracketIndex + 1));

  return newTokens;
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

function tokenizeLoc(loc) {
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

  return tokens;
}
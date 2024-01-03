// A parser for Laminate Orientation Codes (LOCs)

export function validateLoc(loc) {
  const locRegex = /^[0-9 \-+s\[\]\(\)\{\}\<\>/\\]*$/;
  return locRegex.test(loc);
}


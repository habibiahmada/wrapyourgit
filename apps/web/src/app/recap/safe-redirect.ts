/**
 * Where `setPrivateNamesAction` may send the user afterwards. One fixed value, compared exactly:
 * a form field is user input, so it must never become an open redirect.
 */
export function safeRedirect(value: FormDataEntryValue | null): "/settings" | null {
  return value === "/settings" ? "/settings" : null;
}

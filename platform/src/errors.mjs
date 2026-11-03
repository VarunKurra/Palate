// Only approved, actionable copy reaches the screen. Never show raw service errors.
const fallback='We couldn’t finish that request. Please try again. If it keeps happening, contact Palate support.';
const login='The email or password doesn’t match. Check both and try again, or choose “Forgot password?” to reset it.';
const session='Your sign-in has expired. Sign in again to continue.';
const access='You don’t have permission to do this. Ask your restaurant owner or Palate support for access.';
const wait='Too many attempts in a short time. Wait a few minutes, then try again.';
const emailDelivery='We couldn’t send the email right now. Please try again later, or contact Palate support.';
const codes={
 invalid_credentials:login,user_not_found:login,
 email_exists:'An account already uses this email. Sign in instead, or choose “Forgot password?” to reset your password.',
 user_already_exists:'An account already uses this email. Sign in instead, or choose “Forgot password?” to reset your password.',
 email_address_invalid:'Enter a valid email address, such as name@example.com.',
 email_not_confirmed:'This account still needs email confirmation. Open the confirmation email, or contact Palate support if you don’t have it.',
 weak_password:'Choose a stronger password with at least 10 characters. Avoid common words or passwords you use elsewhere.',
 same_password:'Choose a new password that is different from your current one.',
 signup_disabled:'New accounts aren’t available right now. Please contact Palate support.',
 user_banned:'This account is currently unavailable. Contact Palate support for help.',
 email_address_not_authorized:emailDelivery,over_email_send_rate_limit:emailDelivery,
 over_request_rate_limit:wait,over_sms_send_rate_limit:wait,
 otp_expired:'This link has expired or has already been used. Request a new link and open the latest email.',
 flow_state_expired:'This link has expired. Request a new link and try again.',
 flow_state_not_found:'This link can’t be used. Request a new link and open it in the same browser.',
 bad_code_verifier:'Open the email link in the same browser where you requested it, or request a new link.',
 session_expired:session,session_not_found:session,refresh_token_not_found:session,refresh_token_already_used:session,
 bad_jwt:session,reauthentication_needed:'For your security, sign in again before changing your password.',
 reauthentication_not_valid:'That confirmation code didn’t work. Check the latest code and try again.',
 no_authorization:session,not_admin:access,insufficient_aal:'Complete the additional sign-in check, then try again.',
 captcha_failed:'The security check didn’t finish. Refresh the page and try again.',
 request_timeout:'This is taking longer than expected. Refresh to check whether your change went through before trying again.',
 '42501':access,PGRST301:session,PGRST303:session,
 '23503':'Some linked menu content has changed. Refresh the menu and try again.',
 '23514':'One of these details isn’t allowed. Check the names, prices, and other fields, then try again.',
 '23502':'A required detail is missing. Complete the empty fields and try again.',
 '22P02':'One of these details is in the wrong format. Check the fields and try again.',
 PGRST116:'This item is no longer available. Refresh the page to see the latest information.',
 EntityTooLarge:'This image is too large. Choose an image smaller than 10 MB.',
 InvalidMimeType:'This image format isn’t supported. Choose a JPG, PNG, WebP, or AVIF image.',
 AccessDenied:access,Unauthorized:session,
};
const messages=new Map(Object.entries({
 'Invalid login credentials':login,
 'Invitation unavailable':'This invitation has expired, was replaced, or has already been used. Ask the person who invited you for a new link.',
 'Invitation email mismatch':'This invitation is for a different email. Choose “Use a different account” and sign in with the invited email.',
 'Invalid invitation role':'Choose an access level from the list.',
 'Invalid invitation email':'Enter a valid email address for the person you want to invite.',
 'User already registered':codes.user_already_exists,
 'Email not confirmed':codes.email_not_confirmed,
 'New password should be different from the old password.':codes.same_password,
 'Staff access required':'Only Palate staff can do this. Sign in with your staff account or contact Palate support.',
 'Admin access required':'Only a Palate administrator can do this. Ask your administrator for help.',
 'Owner access required':'Only the restaurant owner can do this. Ask the owner to make this change.',
 'Restaurant access required':access,
 'Cannot remove this staff account':'This account can’t be removed here. Ask another Palate administrator for help.',
 'You cannot remove your own access':'You can’t remove your own access. Ask another owner to remove you.',
 'Keep at least one owner':'This restaurant needs at least one owner. Add another owner before removing this one.',
 'Invalid status':'Choose one of the restaurant statuses shown in the list.',
 'Add at least one menu item before activation':'Add at least one dish before making this restaurant’s menu live.',
 'Restaurant not found':'This restaurant is no longer available. Return to the restaurant list and choose it again.',
 'Request not found':'This demo request is no longer available. Refresh the request list.',
 'Choose a restaurant':'Choose a restaurant before approving this request.',
 'Owner must verify their email first':'The owner’s account isn’t ready yet. Ask them to finish signing up or contact Palate support.',
 'Invalid category order':'The categories have changed. Refresh the menu, then reorder them again.',
 'Unknown dish in special':'A dish in this special is no longer available. Choose its dishes again.',
 'Special not found':'This special is no longer available. Refresh the specials list.',
 'Discount exceeds bundle total':'The discount can’t be more than the combined price of the dishes.',
 'The saving cannot exceed the bundle price.':'The discount can’t be more than the combined price of the dishes.',
 'Invalid language':'Choose a language from the list.',
 'Translate every dish name before enabling this language':'Add a translated name for every dish before turning on this language.',
 'Translate descriptions and ingredients before enabling this language':'Translate each dish’s description and ingredients before turning on this language.',
 'Translate every category':'Add a translated name for every category before turning on this language.',
 'Translate restaurant address and hours':'Translate your restaurant’s address and opening hours before turning on this language.',
 'Translate your featured special':'Translate your featured special before turning on this language.',
 'Import between 1 and 500 dishes':'Choose a menu file containing between 1 and 500 dishes.',
 'Every category needs an English name':'Add an English name for every category in your menu file.',
 'Dish category or ID missing':'A dish is missing its category or identifying information. Use the CSV template and try again.',
 'Dish name missing':'Add a name for every dish in your menu file.',
 'A quoted CSV field is not closed.':'The spreadsheet file has an unfinished quotation mark. Export it as CSV again, or use the download template.',
 'This file is empty.':'This file is empty. Choose a file containing your menu items.',
 'CSV needs name, category, and price columns.':'Your spreadsheet needs columns named “name”, “category”, and “price”. Use the CSV template to get started.',
 'Could not load a sample image.':'We couldn’t load a sample photo. Check your connection and try importing again.',
 'Menu unavailable':'This menu isn’t available right now. Please ask the restaurant for help.',
 'Request too long':'This menu is too large to translate in one go. Contact Palate support for help.',
 'Sign in to translate your menu.':session,'Sign in again.':session,
 'You need access to a restaurant with menu items.':'Choose a restaurant you manage and add at least one dish before translating.',
 'AI translation is not configured yet. You can enter reviewed translations below.':'Automatic translation isn’t available yet. You can still enter translations yourself below.',
 'This restaurant has reached its translation limit for this hour.':'You’ve used this hour’s automatic translations. Try again in an hour, or enter translations yourself.',
 'The translation provider is unavailable. Your saved menu has not changed.':'Automatic translation is unavailable right now. Try again later, or enter translations yourself. Your saved menu hasn’t changed.',
 'The translated draft was incomplete. Your saved menu has not changed.':'We couldn’t translate the whole menu. Try again, or enter the missing translations yourself. Your saved menu hasn’t changed.',
 'Could not generate a complete translation. Your saved menu has not changed.':'We couldn’t translate the whole menu. Try again, or enter translations yourself. Your saved menu hasn’t changed.',
}));
const approved=new Set([
 'Choose a JPG, PNG, WebP, or AVIF image.','Choose an image smaller than 10 MB.',
 'Choose a file under 3 MB.','Choose a Palate menu file with items and categories.',
 'Enter a price between 0 and 100,000.','Give this dish a name.','Choose a category.',
 'Choose at least two dishes.','Choose at least two dishes','Add at least one dish.',
 'Import at most 500 dishes at a time.','Choose the restaurant to connect before approving.',
 'This dish changed while you were editing. Close and reopen it to load the latest version.',
 'Choose a translation language.',
]);
export function friendlyError(error,context=''){
 const message=typeof error==='string'?error:typeof error?.message==='string'?error.message:'';
 const code=error?.code;
 if(Object.hasOwn(codes,code))return codes[code];
 if(code==='23505'||/duplicate key value|already exists/i.test(message)){
  if(/restaurants_slug|slug_key/.test(message))return 'That menu address is already taken. Choose a different address for this restaurant.';
  if(/demo_requests/.test(message))return 'You’ve already sent a demo request. Return to your dashboard to check its status.';
  if(/invitations|members|palate_staff/.test(message))return 'This person already has access or an invitation. Check the team list before adding them again.';
  return 'That entry already exists. Refresh the list and edit the existing entry, or choose a different name.';
 }
 if(messages.has(message))return messages.get(message);
 if(approved.has(message))return message.endsWith('.')?message:message+'.';
 const row=message.match(/^Row (\d+): (add a name and category\.|invalid price\.|image must be a full http or https URL\.)$/);
 if(row)return `Row ${row[1]}: `+({'add a name and category.':'add the dish’s name and category.','invalid price.':'enter a price of 0 or more, using numbers only.','image must be a full http or https URL.':'paste the full image link, starting with https://.'}[row[2]]);
 if(/failed to fetch|fetch failed|networkerror|network request failed|load failed|failed to send a request/i.test(message))return 'We couldn’t connect to Palate. Check your internet connection and try again.';
 if(error?.name==='AbortError'||/timeout|timed out/i.test(message))return codes.request_timeout;
 if(/row.level security|permission denied|access denied/i.test(message))return access;
 if(/jwt.*expired|invalid refresh token|auth session missing/i.test(message))return session;
 if(/password should be at least|password.*too short/i.test(message))return 'Use at least 10 characters for your password.';
 if(/email.*invalid|unable to validate email/i.test(message))return codes.email_address_invalid;
 if(/error sending.*email|smtp|email rate limit/i.test(message))return emailDelivery;
 if(/rate limit|too many requests/i.test(message)||Number(error?.status)===429)return wait;
 if(context==='import'&&(error?.name==='SyntaxError'||/json|unexpected token/i.test(message)))return 'We couldn’t read this menu file. Use the CSV template or choose a valid Palate menu file.';
 if(Number(error?.status)===413)return 'This file is too large. Choose a smaller file and try again.';
 if(Number(error?.status)===401)return session;
 if(Number(error?.status)===403)return access;
 return context==='login'?'We couldn’t sign you in right now. Please try again. If it keeps happening, contact Palate support.':fallback;
}

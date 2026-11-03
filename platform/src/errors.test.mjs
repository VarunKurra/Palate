import test from 'node:test';
import assert from 'node:assert/strict';
import {friendlyError} from './errors.mjs';

test('wrong credentials explain the next step without guessing which field is wrong',()=>{
 const text=friendlyError({code:'invalid_credentials',message:'internal auth detail'},'login');
 assert.match(text,/email or password doesn’t match/);assert.match(text,/Forgot password/);
 assert.equal(text,friendlyError('Invalid login credentials'));
});
test('auth codes cover account, password, expired-link, session and rate-limit failures',()=>{
 for(const [code,expected] of Object.entries({user_already_exists:/Sign in instead/,weak_password:/10 characters/,same_password:/different/,otp_expired:/Request a new link/,session_expired:/Sign in again/,over_request_rate_limit:/Wait a few minutes/,email_address_not_authorized:/couldn’t send the email/}))assert.match(friendlyError({code}),expected);
});
test('database conflicts explain the relevant field without leaking SQL',()=>{
 assert.match(friendlyError({code:'23505',message:'duplicate key value violates unique constraint "restaurants_slug_key"'}),/menu address is already taken/);
 assert.match(friendlyError({code:'23505',message:'duplicate key value violates unique constraint "demo_requests_user_id_key"'}),/already sent a demo request/);
 assert.match(friendlyError({code:'42501',message:'new row violates row-level security policy for menu_items'}),/permission/);
 assert.doesNotMatch(friendlyError({code:'XX000',message:'SQL secret_value internal stack trace'}),/SQL|secret_value|stack/);
});
test('import errors preserve row numbers and provide concrete corrections',()=>{
 assert.equal(friendlyError('Row 12: invalid price.'),'Row 12: enter a price of 0 or more, using numbers only.');
 assert.match(friendlyError(new SyntaxError('Unexpected token: private-file-content'),'import'),/CSV template/);
 assert.match(friendlyError('CSV needs name, category, and price columns.'),/columns named/);
});
test('known validation and translation messages stay actionable',()=>{
 assert.equal(friendlyError('Choose an image smaller than 10 MB.'),'Choose an image smaller than 10 MB.');
 assert.match(friendlyError('Translate descriptions and ingredients before enabling this language'),/description and ingredients/);
 assert.match(friendlyError('AI translation is not configured yet. You can enter reviewed translations below.'),/enter translations yourself/);
 assert.match(friendlyError('This dish changed while you were editing. Close and reopen it to load the latest version.'),/Close and reopen/);
});
test('network and unknown failures use safe copy without promising a save failed',()=>{
 assert.match(friendlyError(new TypeError('Failed to fetch')),/internet connection/);
 assert.match(friendlyError({name:'AbortError'}),/check whether your change went through/);
 for(const error of [null,undefined,{},new Error('<script>secret</script>'),{code:'constructor'},{code:'toString'}]){
  assert.equal(typeof friendlyError(error),'string');assert.doesNotMatch(friendlyError(error),/script|secret|constructor|toString/);
 }
});

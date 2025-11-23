const insta = require("instagram-url-direct");
console.log('Type:', typeof insta);
console.log('Value:', insta);

if (typeof insta === 'function') {
    console.log('It is a function');
} else {
    console.log('Keys:', Object.keys(insta));
}

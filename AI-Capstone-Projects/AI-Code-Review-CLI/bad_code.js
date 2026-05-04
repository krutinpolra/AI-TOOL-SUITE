import * as fs from 'fs';

// Function with unclear variable naming and type mismatch
function getUserID(user) {
    const x = user.id;
    // @ts-ignore - Type error: returning string instead of number
    return x.toString();
}
// Function with hardcoded API key (security issue)
function initializeAPI() {
    const apiKey = 'sk-12345-abcde-secret-key-67890';
    const API_TOKEN = 'ghp_1234567890abcdefSECRETtoken';
    console.log('API initialized with key:', apiKey);
    return apiKey;
}
// Function with poor naming and missing error handling
function calc(a, b) {
    // Magic number - should be a constant
    const x = a + b + 42;
    return x;
}
// Unused import and missing fs import causes error
function writeLog(message) {
    // This will fail because fs needs to be imported properly
    fs.writeFileSync('log.txt', message);
}
// Function that's too long and does too many things
function processUserData(users) {
    const x = [];
    for (let i = 0; i < users.length; i++) {
        const u = users[i];
        if (u.id > 0) {
            if (u.name.length > 0) {
                const data = {
                    id: u.id,
                    name: u.name,
                    processed: true,
                };
                x.push(data);
            }
        }
    }
    return x;
}
// Function with SQL injection vulnerability
function getUserByName(username) {
    // Direct string concatenation with user input - SQL injection risk
    const query = "SELECT * FROM users WHERE name = '" + username + "'";
    return query;
}
// Main function with multiple issues
function main() {
    const currentUser = { id: 1, name: 'Alice' };
    // Calling function with wrong return type
    console.log(getUserID(currentUser));
    // Using hardcoded credentials
    const key = initializeAPI();
    // No error handling
    writeLog('User logged in');
    // Code duplication
    const total1 = calc(10, 20);
    const total2 = calc(15, 25);
    const total3 = calc(5, 10);
    console.log(total1, total2, total3);
    // Missing input validation
    const userName = process.argv[2];
    console.log(getUserByName(userName));
}
main();

// Test file with intentional bad practices

// Global variable pollution
var globalCounter = 0;
var userData = {};

// Function with no error handling
function divideNumbers(a, b) {
    return a / b; // What if b is 0?
}

// Callback hell
function fetchUserData(userId, callback) {
    setTimeout(() => {
        callback({ id: userId, name: 'John' });
    }, 100);
}

function processData() {
    fetchUserData(1, (user) => {
        fetchUserData(2, (user2) => {
            fetchUserData(3, (user3) => {
                fetchUserData(4, (user4) => {
                    console.log('All users loaded');
                });
            });
        });
    });
}

// Hardcoded credentials
const DB_PASSWORD = 'admin123';
const API_SECRET = 'my-super-secret-key-12345';

// No input validation
function createUser(username, email) {
    const query = `INSERT INTO users VALUES ('${username}', '${email}')`;
    console.log(query);
    return query;
}

// Unused variables
function calculateTotal(items) {
    let sum = 0;
    let average = 0;
    let count = items.length;
    let unusedVar = 42;
    
    for (let i = 0; i < items.length; i++) {
        sum += items[i].price;
    }
    
    return sum;
}

// Magic numbers everywhere
function calculateDiscount(price) {
    if (price > 100) {
        return price * 0.15;
    } else if (price > 50) {
        return price * 0.10;
    } else if (price > 20) {
        return price * 0.05;
    }
    return 0;
}

// Mixed var, let, const
function messyVariables() {
    var x = 1;
    let y = 2;
    var z = 3;
    const a = 4;
    let b = 5;
    return x + y + z + a + b;
}

// No comments or documentation
function cmplxFn(d) {
    let r = [];
    for (let i = 0; i < d.length; i++) {
        if (d[i].s > 3 && d[i].t === 'a') {
            r.push(d[i]);
        }
    }
    return r;
}

// Try-catch without proper handling
function riskyOperation() {
    try {
        JSON.parse('invalid json {');
    } catch (e) {
        // swallowing errors silently
    }
}

// Console.log in production code
function authenticateUser(password) {
    console.log('Password received:', password);
    console.log('Checking authentication...');
    return password === 'password123';
}

// Deeply nested conditionals
function complexLogic(user) {
    if (user) {
        if (user.isActive) {
            if (user.hasPermission) {
                if (user.subscription) {
                    if (user.subscription.isPaid) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

export { divideNumbers, createUser, calculateTotal };

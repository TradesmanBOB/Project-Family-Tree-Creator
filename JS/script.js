// JavaScript for Family Tree Creator

// This script handles the account dropdown functionality
// Get references to the account button and dropdown menu
// This script handles the account dropdown functionality

// Get references to the account button and dropdown menu
const accountBtn = document.getElementById('account-btn');
const accountDropdown = document.getElementById('account-dropdown');

if (accountBtn && accountDropdown) {
    // Toggle dropdown visibility on button click
    accountBtn.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent the click from bubbling up
        const isOpen = accountDropdown.classList.toggle('show');
        accountBtn.setAttribute('aria-expanded', isOpen);
    });

    // Hide dropdown when clicking outside of it
    document.addEventListener('click', function () {
        accountDropdown.classList.remove('show');
        accountBtn.setAttribute('aria-expanded', 'false');
    });

    // Optional: Close dropdown when pressing Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            accountDropdown.classList.remove('show');
            accountBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// rest of js functions
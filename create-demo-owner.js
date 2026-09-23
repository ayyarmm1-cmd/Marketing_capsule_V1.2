/**
 * Script to create a Demo Owner account
 * 
 * Instructions:
 * 1. Open your browser console (F12 or Cmd+Option+I)
 * 2. Make sure you're logged in as an Owner or Admin
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 
 * The script will create a Demo Owner account with:
 * - Email: demo@upwardmm.com
 * - Name: Demo Owner
 * - Role: Demo Owner
 */

(async function() {
    try {
        // Import the API function (you may need to adjust the import path)
        // For browser console, we'll use the window object if available
        if (typeof window === 'undefined' || !window.apiAddEmployee) {
            console.error('Please run this script in the browser console while on the Upward application.');
            console.error('Make sure you are logged in and the application is loaded.');
            return;
        }

        // Get departments first
        const departments = await window.apiGetDepartments();
        const managementDept = departments.find(d => d.name.toLowerCase().includes('management')) || departments[0];
        
        if (!managementDept) {
            console.error('No departments found. Please create a department first.');
            return;
        }

        // Prompt for password
        const password = prompt('Enter initial password for demo@upwardmm.com:');
        if (!password || password.length < 6) {
            console.error('Password must be at least 6 characters long.');
            return;
        }

        console.log('Creating Demo Owner account...');
        console.log('Email: demo@upwardmm.com');
        console.log('Department: ' + managementDept.name);

        // Create the employee
        const employeeData = {
            name: 'Demo Owner',
            email: 'demo@upwardmm.com',
            role: 'Demo Owner',
            departmentId: managementDept.id,
            jobTitle: 'Demo Owner',
            basicPay: 0,
            joiningDate: new Date().toISOString().split('T')[0],
            employeeStatus: 'On Probation',
            hasLoginAccess: true,
            requiresPasswordChange: true,
            paymentType: 'Monthly',
            tempPassword: password,
        };

        const result = await window.apiAddEmployee(employeeData);
        
        console.log('✅ Success! Demo Owner account created:');
        console.log('Employee ID: ' + result.employeeId);
        console.log('User ID: ' + result.id);
        console.log('Email: ' + result.email);
        console.log('\nYou can now log in with:');
        console.log('Email: demo@upwardmm.com');
        console.log('Password: [the password you entered]');
        
    } catch (error) {
        console.error('❌ Error creating account:', error);
        console.error('Error details:', error.message);
        
        if (error.message.includes('email-already-in-use')) {
            console.error('\n⚠️  This email is already registered. Please use a different email or delete the existing account first.');
        } else if (error.message.includes('permission')) {
            console.error('\n⚠️  Permission denied. Make sure you are logged in as an Owner or Admin.');
        }
    }
})();


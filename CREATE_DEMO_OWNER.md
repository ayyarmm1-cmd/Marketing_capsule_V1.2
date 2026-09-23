# How to Create a Demo Owner Account

## Method 1: Using the Staff Management UI (Recommended)

1. Log in as an **Owner** or **Admin**
2. Navigate to **HR > Staff Management**
3. Click **"+ Add Employee"** button
4. Fill in the form with these values:
   - **Full Name***: `Demo Owner`
   - **Login Email***: `demo@upwardmm.com`
   - **Grant Login Access to ERP**: ✓ (checked)
   - **Initial Password***: Enter a password (minimum 6 characters)
   - **Require password change on first login**: ✓ (checked)
   - **Role***: Select `Demo Owner`
   - **Department***: Select any department (e.g., "Management")
   - **Job Title***: `Demo Owner`
   - **Joining Date***: Today's date
   - **Employee Status***: `On Probation`
   - **Basic Pay (MMK)***: `0` (or any amount)
5. Click **"Add Employee"**

## Method 2: Using Browser Console (If UI has issues)

1. Log in as an **Owner** or **Admin**
2. Navigate to **HR > Staff Management** page
3. Open Browser Console (F12 or Cmd+Option+I)
4. Paste and run this code:

```javascript
(async function() {
    // Import the API functions
    const { apiAddEmployee, apiGetDepartments } = await import('./services/api.js');
    const { UserRole, EmployeeStatus } = await import('./types.js');
    
    try {
        // Get departments
        const departments = await apiGetDepartments();
        const managementDept = departments.find(d => 
            d.name.toLowerCase().includes('management')
        ) || departments[0];
        
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

        // Create the employee
        const employeeData = {
            name: 'Demo Owner',
            email: 'demo@upwardmm.com',
            role: UserRole.DEMO_OWNER,
            departmentId: managementDept.id,
            jobTitle: 'Demo Owner',
            basicPay: 0,
            joiningDate: new Date().toISOString().split('T')[0],
            employeeStatus: EmployeeStatus.ON_PROBATION,
            hasLoginAccess: true,
            requiresPasswordChange: true,
            paymentType: 'Monthly',
            tempPassword: password,
        };

        const result = await apiAddEmployee(employeeData);
        
        console.log('✅ Success! Demo Owner account created:');
        console.log('Employee ID:', result.employeeId);
        console.log('User ID:', result.id);
        console.log('Email:', result.email);
        console.log('\nYou can now log in with:');
        console.log('Email: demo@upwardmm.com');
        console.log('Password: [the password you entered]');
        
    } catch (error) {
        console.error('❌ Error creating account:', error);
        if (error.message.includes('email-already-in-use')) {
            console.error('⚠️  This email is already registered.');
        } else if (error.message.includes('permission')) {
            console.error('⚠️  Permission denied. Make sure you are logged in as Owner or Admin.');
        }
    }
})();
```

## Troubleshooting

### If validation error appears even with all fields filled:
1. Make sure **Full Name** and **Login Email** fields are visible and filled (scroll up if needed)
2. Check that **Department** is selected (not empty)
3. Ensure **Initial Password** is at least 6 characters
4. Try refreshing the page and filling the form again

### If "email already in use" error:
- The email `demo@upwardmm.com` is already registered
- Either use a different email or delete the existing account first

### If permission error:
- Make sure you're logged in as an **Owner** or **Admin**
- Only these roles can create new employees with login access


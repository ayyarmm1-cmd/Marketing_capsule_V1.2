/**
 * Browser Console Script to Create Demo Owner Account
 * 
 * INSTRUCTIONS:
 * 1. Log in to Upward as Owner or Admin
 * 2. Navigate to HR > Staff Management page
 * 3. Open Browser Console (F12 or Cmd+Option+I on Mac)
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter
 * 6. Enter password when prompted
 */

(async () => {
    try {
        // Dynamic import of API functions
        const apiModule = await import('./services/api.js');
        const typesModule = await import('./types.js');
        
        const { apiAddEmployee, apiGetDepartments } = apiModule;
        const { UserRole, EmployeeStatus } = typesModule;
        
        console.log('🔍 Loading departments...');
        const departments = await apiGetDepartments();
        
        if (!departments || departments.length === 0) {
            throw new Error('No departments found. Please create a department first in Settings.');
        }
        
        const managementDept = departments.find(d => 
            d.name.toLowerCase().includes('management')
        ) || departments[0];
        
        console.log('✅ Found department:', managementDept.name);
        
        // Prompt for password
        const password = prompt('Enter initial password for demo@upwardmm.com (min 6 characters):');
        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
        }
        
        console.log('📝 Creating Demo Owner account...');
        console.log('   Email: demo@upwardmm.com');
        console.log('   Name: Demo Owner');
        console.log('   Department: ' + managementDept.name);
        
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
        
        console.log('\n✅ SUCCESS! Demo Owner account created!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Employee ID:', result.employeeId);
        console.log('User ID:', result.id);
        console.log('Email:', result.email);
        console.log('Name:', result.name);
        console.log('Role:', result.role);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📧 Login Credentials:');
        console.log('   Email: demo@upwardmm.com');
        console.log('   Password: [the password you entered]');
        console.log('\n⚠️  Note: User will be required to change password on first login.');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.message.includes('email-already-in-use') || error.message.includes('already exists')) {
            console.error('\n⚠️  This email is already registered.');
            console.error('   Solution: Use a different email or delete the existing account first.');
        } else if (error.message.includes('permission') || error.message.includes('Permission')) {
            console.error('\n⚠️  Permission denied.');
            console.error('   Solution: Make sure you are logged in as Owner or Admin.');
        } else if (error.message.includes('Cannot find module')) {
            console.error('\n⚠️  Module import failed.');
            console.error('   Solution: Make sure you are on the Upward application page and it is fully loaded.');
        } else {
            console.error('\nFull error:', error);
        }
    }
})();


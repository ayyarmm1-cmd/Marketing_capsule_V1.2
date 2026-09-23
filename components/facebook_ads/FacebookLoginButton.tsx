import React, { useEffect } from 'react';

// Define the structure of the Facebook login response for type safety
interface FBLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

// Define the props for our component
interface FacebookLoginButtonProps {
  onLoginSuccess: (response: FBLoginResponse) => void;
  onLoginFailure?: () => void;
}

// Global declaration for the Facebook SDK object to avoid TypeScript errors
declare global {
    interface Window {
        FB: any;
        checkLoginState: (response: FBLoginResponse) => void;
    }
}

const FacebookLoginButton: React.FC<FacebookLoginButtonProps> = ({ onLoginSuccess, onLoginFailure }) => {

  // This useEffect hook sets up the global callback function `checkLoginState`
  // that the Facebook button's `onlogin` attribute will call. This is necessary because
  // the button's attribute can only invoke global functions.
  useEffect(() => {
    window.checkLoginState = (response: FBLoginResponse) => {
      if (response.status === 'connected') {
        console.log('Facebook login successful:', response);
        onLoginSuccess(response);
      } else {
        console.log('Facebook login failed or was not authorized.');
        if (onLoginFailure) {
          onLoginFailure();
        }
      }
    };

    // If the Facebook SDK is already loaded, we need to explicitly parse for XFBML tags
    // like our login button to ensure they are rendered correctly by the SDK.
    if (window.FB) {
      window.FB.XFBML.parse();
    }

    // Cleanup: It's good practice to remove the global function when the component unmounts
    // to avoid potential memory leaks or conflicts.
    return () => {
      if (window.checkLoginState) {
        delete window.checkLoginState;
      }
    };
  }, [onLoginSuccess, onLoginFailure]);

  // The official Facebook Login Button rendered using XFBML.
  // - `scope`: This defines the permissions we are requesting from the user. 
  //   `pages_show_list` is the key permission for this feature.
  // - `data-onlogin`: Specifies the global JavaScript function to call upon login completion.
  // - `data-use-continue-as`: Provides a seamless "Continue as [User]" experience for returning users.
  return (
    <div 
      className="fb-login-button"
      data-scope="pages_show_list,ads_read,read_insights,business_management,ads_management"
      data-onlogin="checkLoginState"
      data-use-continue-as="true"
    >
      Connect Facebook Account
    </div>
  );
};

export default FacebookLoginButton;
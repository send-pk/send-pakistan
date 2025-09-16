import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, Parcel } from './types';
import { DataProvider, useData } from './context/DataContext';
import AdminDashboard from './components/admin/AdminDashboard';
import BrandDashboard from './components/client/ClientDashboard';
import DriverApp from './components/driver/DriverApp';
import LoginScreen from './components/LoginScreen';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { supabase } from './supabase';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = window.localStorage.getItem('send_theme');
            if (storedTheme) return storedTheme as Theme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('send_theme', theme);
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Case conversion helpers for fetching user profile
const toCamel = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const isObject = (obj: any): boolean => obj === Object(obj) && !Array.isArray(obj) && typeof obj !== 'function';
const keysToCamel = (obj: any): any => {
  if (isObject(obj)) {
    const n: { [key: string]: any } = {};
    Object.keys(obj).forEach((k) => { n[toCamel(k)] = keysToCamel(obj[k]); });
    return n;
  } else if (Array.isArray(obj)) {
    return obj.map((i) => keysToCamel(i));
  }
  return obj;
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeParcel, setActiveParcel] = useState<Parcel | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { fetchData, clearData } = useData();

  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error || !data) {
          console.error('Error fetching user profile:', error?.message);
          return null;
      }
      return keysToCamel(data) as User;
  }, []);

  // Effect to handle authentication state changes
  useEffect(() => {
    // The onAuthStateChange listener is the single source of truth for auth state.
    // It fires once on initial load, and again on SIGNED_IN/SIGNED_OUT events.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
            const userProfile = await fetchUserProfile(session.user.id);
            if (userProfile) {
                // Set the user immediately. The data fetching will be triggered
                // by the other useEffect hook that depends on `currentUser`.
                setCurrentUser(userProfile);
            } else {
                // This is a critical error state: a user is authenticated with Supabase
                // but doesn't have a corresponding profile in our `users` table.
                console.error(`User with ID ${session.user.id} is authenticated but has no profile.`);
                await supabase.auth.signOut();
            }
        } else {
            setCurrentUser(null);
            setActiveParcel(null);
            clearData();
        }
        // The initial auth status check is complete after this listener fires for the first time.
        setCheckingStatus(false);
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, clearData]);

  // Effect to fetch application data once a user is authenticated and set
  useEffect(() => {
    if (currentUser) {
        // Data fetching errors are now handled within the DataContext itself,
        // preventing the app from signing out the user on a data failure.
        fetchData();
    }
  }, [currentUser, fetchData]);


  const handleLogin = (user: User, parcel?: Parcel) => {
    // This handler is specifically for the customer tracking flow, which doesn't
    // require a full data load.
    setCurrentUser(user);
    if(parcel) {
        setActiveParcel(parcel);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle clearing user state.
  };

  const renderContent = () => {
    // Show a loader only while checking the initial authentication status.
    // The dashboard component itself will handle the data loading state.
    if (checkingStatus) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    // As requested, forcing the Admin Dashboard to load for any logged-in user.
    // The original role-based routing logic is preserved in comments below.
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
    
    /*
    switch (currentUser.role) {
      case UserRole.ADMIN:
      case UserRole.WAREHOUSE_MANAGER:
        return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
      case UserRole.BRAND:
        return <BrandDashboard user={currentUser} onLogout={handleLogout} />;
      case UserRole.DRIVER:
        return <DriverApp user={currentUser} onLogout={handleLogout} />;
      case UserRole.CUSTOMER:
        if (activeParcel) {
            return <CustomerDashboard user={currentUser} parcel={activeParcel} onLogout={handleLogout} />;
        }
        // Fallback if customer is logged in but parcel is missing
        return <LoginScreen onLogin={handleLogin} />;
      default:
        return <LoginScreen onLogin={handleLogin} />;
    }
    */
  };

  return (
    <>
       <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              color: #000;
            }
            /* General Print Typography & Tables */
            .printable-area table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
                font-size: 10pt;
            }
            .printable-area th, .printable-area td {
                border: 1px solid #999;
                padding: 6px;
                text-align: left;
            }
            .printable-area thead th {
                background-color: #eee;
                font-weight: bold;
            }
            .printable-area .text-right {
                text-align: right;
            }
            .printable-area .font-bold {
                font-weight: bold;
            }
            /* Salary Report Specific Styles */
            .printable-area .sub-row > td {
                padding-left: 24px;
                border: none;
                font-size: 9pt;
                color: #333;
            }
             .printable-area .total-row > td {
                font-weight: bold;
                border-top: 2px solid #000;
                background-color: #f9f9f9;
             }
            /* Styles for joint AWB printing */
            .joint-awb-container {
              display: block; /* Override flex */
            }
            .single-awb-wrapper {
              height: auto; /* Override height to let content size it */
              width: 100%;
              page-break-inside: avoid;
              padding: 0; /* Remove padding which can cause overflow */
              margin-bottom: 0.05cm; /* Add tiny spacing between AWBs */
            }
            .awb-print-size {
              box-sizing: border-box; /* Ensure padding is included in dimensions */
              height: 9.5cm; /* Explicit height for print */
              width: 19cm; /* Explicit width for print */
              margin: 0 auto; /* Center horizontally on the page */
              /* Override inline/tailwind styles for print */
              aspect-ratio: auto !important;
              max-width: none !important;
            }
            .no-print {
              display: none !important;
            }
            /* Styles for multi-page invoices */
            thead {
                display: table-header-group;
            }
            tbody tr, tfoot {
                page-break-inside: avoid;
            }
          }
        `}
      </style>
      <div className="min-h-screen bg-background text-content-primary">
        {renderContent()}
      </div>
    </>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;
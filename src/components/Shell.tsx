import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Beef as Cow, 
  Droplets, 
  Package, 
  Wallet, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Milk,
  LayoutDashboard,
  Sunrise,
  Bell,
  Search,
  Timer,
  Stethoscope,
  FileText,
  Download,
  Sun,
  Moon,
  Calendar
} from 'lucide-react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  triggerAuthNotification
} from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../lib/useProfile';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'employee';
  farmId?: string;
  farmDetailsCompleted?: boolean;
  ownerUsername?: string;
  securityPin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  farmDetails?: {
    farmName: string;
    location: string;
    sizeAcres: number;
    primaryProduction: string;
    estimatedCattle: number;
    waterSource: string;
    phone: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    ownerDesignation?: string;
  };
}

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const [user, setUser] = useState<User | null>(null);
  const { profile: liveProfile, loading: profileLoading } = useProfile();
  const [profileState, setProfileState] = useState<UserProfile | null>(null);
  const loading = profileLoading && !profileState;

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (liveProfile) {
      setProfileState(liveProfile);
    }
  }, [liveProfile]);

  const profile = profileState;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // First-Time Farmer Onboarding Form State
  const [farmName, setFarmName] = useState('SAVANNA PRECINCT');
  const [farmLocation, setFarmLocation] = useState('SAVANNA RIFT VALLEY');
  const [farmSize, setFarmSize] = useState('1200');
  const [primaryProduction, setPrimaryProduction] = useState('Dairy Production');
  const [estimatedCattle, setEstimatedCattle] = useState('450');
  const [waterSource, setWaterSource] = useState('Spring Aquifer Borehole');
  const [farmPhone, setFarmPhone] = useState('+254 700 123 456');
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // Owner detail states
  const [ownerName, setOwnerName] = useState('SAVANNA OPERATOR');
  const [ownerPhone, setOwnerPhone] = useState('+254 700 123 456');
  const [ownerEmail, setOwnerEmail] = useState('operator@savanna.pro');
  const [ownerDesignation, setOwnerDesignation] = useState('Managing Chief Director');

  useEffect(() => {
    if (user) {
      if (user.displayName && !ownerName) {
        setOwnerName(user.displayName.toUpperCase());
      }
      if (user.email && !ownerEmail) {
        setOwnerEmail(user.email);
      }
    }
  }, [user, ownerName, ownerEmail]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!farmName.trim() || !farmLocation.trim() || !farmSize || !estimatedCattle || !ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim()) {
      setOnboardingError('Please fulfill all security checklist elements including owner registration details.');
      return;
    }
    setOnboardingSubmitting(true);
    setOnboardingError('');

    try {
      const details = {
        farmName: farmName.trim().toUpperCase(),
        location: farmLocation.trim().toUpperCase(),
        sizeAcres: parseFloat(farmSize) || 0,
        primaryProduction,
        estimatedCattle: parseInt(estimatedCattle) || 0,
        waterSource,
        phone: farmPhone.trim() || 'N/A',
        ownerName: ownerName.trim().toUpperCase(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerDesignation: ownerDesignation.trim().toUpperCase(),
      };

      // 1. Store in standard "farms" collection
      await setDoc(doc(db, 'farms', user.uid), {
        ...details,
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
      });

      // 2. Update user profile to set farmDetailsCompleted
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        farmDetailsCompleted: true,
        farmDetails: details
      }, { merge: true });

    } catch (err: any) {
      console.error("Onboarding setup failed", err);
      setOnboardingError(err.message || 'Verification of ecosystem details failed.');
    } finally {
      setOnboardingSubmitting(false);
    }
  };
  const [selectedRole, setSelectedRole] = useState<UserProfile['role']>('owner');
  const [farmsList, setFarmsList] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom Employee Auth States
  const [employeesForFarm, setEmployeesForFarm] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Custom Owner Security detail states (replaces direct Email Auth for Owner)
  const [ownerUsername, setOwnerUsername] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('first_tractor');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [ownerRecoveryMode, setOwnerRecoveryMode] = useState(false);

  const location = useLocation();

  useEffect(() => {
    // Fetch registered farms
    const unsubFarms = onSnapshot(collection(db, 'farms'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFarmsList(list);
    });
    return () => unsubFarms();
  }, []);



  const handleSignOut = async () => {
    // Session termination is not available as credentials are baked into the protocol
    console.log("No credential offloading needed in embedded operator mode.");
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Herd', path: '/herd', icon: Cow },
    { name: 'Milk Production', path: '/production', icon: Droplets },
    { name: 'Health', path: '/health', icon: Stethoscope },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Staff', path: '/labour', icon: UserIcon },
    { name: 'Inventory', path: '/inventory', icon: Package },
    ...(profile?.role === 'owner' ? [
      { name: 'Finances', path: '/finance', icon: Wallet }
    ] : []),
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  const validatePasswordStrength = (pwd: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push('Must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Must contain at least one uppercase letter (A-Z).');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Must contain at least one lowercase letter (a-z).');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Must contain at least one number (0-9).');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push('Must contain at least one special character (e.g. !@#$%^&*).');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError('');
    
    try {
      const authEmail = email.toLowerCase().trim();
      if (!authEmail || !authEmail.includes('@')) {
        throw new Error('Please enter a valid Email Address.');
      }

      if (isRegister) {
        const strength = validatePasswordStrength(password);
        if (!strength.isValid) {
          throw new Error('Password is not strong enough: ' + strength.errors.join(' '));
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (!displayName.trim()) {
          throw new Error('Please enter your full name.');
        }

        if (selectedRole === 'employee' && !selectedFarm) {
          throw new Error('Please select your assigned farm.');
        }

        const finalDisplayName = displayName.trim().toUpperCase();

        (window as any).isRegisteringEmailPassword = true;
        const result = await createUserWithEmailAndPassword(auth, authEmail, password);
        await updateProfile(result.user, { displayName: finalDisplayName });
        
        // Initial profile creation
        const docRef = doc(db, 'users', result.user.uid);
        const inferredUsername = authEmail.split('@')[0].toUpperCase();
        const newProfile: UserProfile = {
          uid: result.user.uid,
          email: result.user.email || authEmail,
          displayName: finalDisplayName,
          role: selectedRole,
          farmId: selectedRole === 'employee' ? (selectedFarm?.id || '') : result.user.uid,
          farmDetailsCompleted: selectedRole === 'employee' ? true : false,
          ownerUsername: inferredUsername,
          farmDetails: selectedRole === 'employee' && selectedFarm ? {
            farmName: selectedFarm.farmName || '',
            location: selectedFarm.location || '',
            sizeAcres: selectedFarm.sizeAcres || 0,
            primaryProduction: selectedFarm.primaryProduction || '',
            estimatedCattle: selectedFarm.estimatedCattle || 0,
            waterSource: selectedFarm.waterSource || '',
            phone: selectedFarm.phone || 'N/A'
          } : undefined
        };
        await setDoc(docRef, newProfile);
        setProfileState(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, password);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      delete (window as any).isRegisteringEmailPassword;
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream-100 font-sans">
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8"
        >
          <div className="p-8 bg-terracotta-500 rounded-full shadow-[0px_0px_40px_rgba(166,75,42,0.3)]">
            <Milk className="w-16 h-16 text-cream-100" />
          </div>
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-terracotta-500">SAVANNA DAIRY FARM</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-100 p-4 font-sans relative overflow-hidden">
        {/* Environmental Context Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1547333590-47fae5f58d21?q=80&w=2670&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-10 grayscale mix-blend-multiply"
            alt="Savanna Environment"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cream-100/40 via-transparent to-mud-900/10" />
          <div className="absolute inset-0 bg-pattern opacity-30" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white border-4 border-mud-900 p-6 sm:p-10 lg:p-12 shadow-[24px_24px_0px_#A64B2A] relative overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Decorative Technical PNGs */}
          <img 
            src="https://www.freeiconspng.com/uploads/silo-png-1.png" 
            className="absolute -top-12 -right-12 w-48 opacity-[0.05] grayscale brightness-50 pointer-events-none rotate-12"
            alt=""
          />
          <img 
            src="https://www.freeiconspng.com/uploads/cow-png-30.png" 
            className="absolute -bottom-16 -left-16 w-64 opacity-[0.03] grayscale pointer-events-none -rotate-12"
            alt=""
          />
          
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-terracotta-500 via-ochre-500 to-terracotta-500" />
          
          {/* Unified Fixed Brand Header */}
          <div className="flex-shrink-0 text-center mb-6 border-b border-mud-900/5 pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 sm:p-6 bg-mud-900 text-cream-100 shadow-[6px_6px_0px_#D99125]">
                <Milk className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-1.5 tracking-tighter text-mud-900 font-serif italic uppercase text-balance">SAVANNA PRO</h1>
            <p className="text-mud-900/40 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em]">Advanced Ecosystem Infrastructure v4.2</p>
          </div>

          {/* Scrollable Container */}
          <div className="flex-grow overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={isRegister ? "register" : "login"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center mb-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-terracotta-500 mb-1">
                    {isRegister ? "Create New Account" : "Sign In to Account"}
                  </h2>
                  <p className="text-mud-900/40 font-bold text-[9px] uppercase tracking-wider">
                    {isRegister ? "Create standard secure farm login" : "Direct email account login"}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-5">
                  {isRegister && (
                    <>
                      {/* Name field */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-mud-900/20" />
                          <input 
                            type="text" 
                            required 
                            placeholder="YOUR FULL NAME"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value.toUpperCase())}
                            className="w-full pl-16 pr-8 py-4 bg-cream-100 border-2 border-mud-900 font-black text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Role selection buttons */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Your Role</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole('owner');
                              setSelectedFarm(null);
                            }}
                            className={`py-3 px-4 border-2 font-black text-xs uppercase tracking-widest transition-all ${
                              selectedRole === 'owner'
                                ? 'bg-mud-900 text-cream-100 border-mud-900 shadow-[4px_4px_0px_#A64B2A]'
                                : 'bg-cream-100 text-mud-900 border-mud-900/15 hover:bg-cream-200'
                            }`}
                          >
                            Farm Owner
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole('employee');
                              if (farmsList.length > 0 && !selectedFarm) {
                                setSelectedFarm(farmsList[0]);
                              }
                            }}
                            className={`py-3 px-4 border-2 font-black text-xs uppercase tracking-widest transition-all ${
                              selectedRole === 'employee'
                                ? 'bg-mud-900 text-cream-100 border-mud-900 shadow-[4px_4px_0px_#A64B2A]'
                                : 'bg-cream-100 text-mud-900 border-mud-900/15 hover:bg-cream-200'
                            }`}
                          >
                            Farm Employee
                          </button>
                        </div>
                      </div>

                      {/* Farm assignment dropdown */}
                      {selectedRole === 'employee' && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Assigned Farm</label>
                          <select
                            value={selectedFarm?.id || ''}
                            onChange={(e) => {
                              const found = farmsList.find(f => f.id === e.target.value);
                              setSelectedFarm(found || null);
                            }}
                            required
                            className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-black text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors text-mud-900"
                          >
                            <option value="">-- SELECT YOUR ASSIGNED FARM --</option>
                            {farmsList.map((farm) => (
                              <option key={farm.id} value={farm.id}>
                                {farm.farmName.toUpperCase()} - {farm.location.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Email address */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-mud-900/20" />
                      <input 
                        type="email" 
                        required 
                        placeholder="EMAIL ADDRESS"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-cream-100 border-2 border-mud-900 font-black text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-mud-900/20" />
                      <input 
                        type="password" 
                        required 
                        placeholder="PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-cream-100 border-2 border-mud-900 font-black text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    {isRegister && password && (
                      <div className="mt-3 p-4 bg-cream-100/50 border border-mud-900/10 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-mud-900/40 block">Password Checklist</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[8px] font-black uppercase tracking-widest text-left">
                          <div className={`flex items-center space-x-2 ${password.length >= 8 ? 'text-green-600' : 'text-mud-900/40'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-green-600' : 'bg-mud-900/40'}`} />
                            <span>At least 8 characters ({password.length}/8)</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-mud-900/40'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-600' : 'bg-mud-900/40'}`} />
                            <span>At least 1 uppercase letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-mud-900/40'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-green-600' : 'bg-mud-900/40'}`} />
                            <span>At least 1 lowercase letter (a-z)</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-mud-900/40'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-green-600' : 'bg-mud-900/40'}`} />
                            <span>At least 1 number (0-9)</span>
                          </div>
                          <div className={`flex items-col sm:col-span-2 items-center space-x-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-mud-900/40'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-600' : 'bg-mud-900/40'}`} />
                            <span>At least 1 special char (e.g. !@#$)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isRegister && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 font-sans">Confirm Master Passcode</label>
                      <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-mud-900/20" />
                        <input 
                          type="password" 
                          required 
                          placeholder="CONFIRM MASTER PASSCODE"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-16 pr-8 py-4 bg-cream-100 border-2 border-mud-900 font-black text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-4 bg-terracotta-500/10 border-l-4 border-terracotta-500 text-[10px] font-black uppercase text-terracotta-500 tracking-widest">
                      {authError}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 pt-2">
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center space-x-4 px-8 py-4 bg-mud-900 text-white font-black uppercase tracking-widest shadow-[8px_8px_0px_rgba(38,28,26,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                           <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center mt-6">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setAuthError('');
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-mud-900/40 hover:text-terracotta-500 transition-colors"
                    >
                      {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                    </button>
                  </p>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-12 text-center text-[9px] font-bold text-mud-900/30 uppercase tracking-[0.4em]">
            Verified credentials required for farm access
          </div>
        </motion.div>
      </div>
    );
  }

  // Show Onboarding Screen if Owner and has not yet completed farm details
  const showOnboarding = user && profile && profile.role === 'owner' && !profile.farmDetailsCompleted;

  if (showOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-100 p-4 font-sans relative overflow-hidden">
        {/* Environmental Context Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1547333590-47fae5f58d21?q=80&w=2670&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-10 grayscale mix-blend-multiply"
            alt="Savanna Environment"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cream-100/40 via-transparent to-mud-900/10" />
          <div className="absolute inset-0 bg-pattern opacity-30" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-white border-4 border-mud-900 p-6 sm:p-10 lg:p-12 shadow-[24px_24px_0px_#A64B2A] relative overflow-hidden z-20 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 text-center mb-6 border-b border-mud-900/5 pb-4">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-mud-900 text-cream-100 shadow-[6px_6px_0px_#D99125]">
                <Cow className="w-10 h-10 text-cream-100" />
              </div>
            </div>
            <h1 className="text-3xl font-black mb-1.5 tracking-tighter text-mud-900 font-serif italic uppercase text-balance">Farm Registry</h1>
            <p className="text-mud-900/40 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em]">Register your farm details</p>
          </div>

          {/* Form */}
          <div className="flex-grow overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            <form onSubmit={handleOnboardingSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Farm Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Farm Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. SAVANNA VALLEY FARM"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Location / Region</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. RIFT VALLEY, KENYA"
                      value={farmLocation}
                      onChange={(e) => setFarmLocation(e.target.value.toUpperCase())}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Farm Size */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Farm Size (Acres)</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      placeholder="e.g. 150"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Operational Focus */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Operational Focus</label>
                    <select
                      value={primaryProduction}
                      onChange={(e) => setPrimaryProduction(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors text-mud-900"
                    >
                      <option value="Dairy Production">Dairy Production</option>
                      <option value="Beef Cattle">Beef Cattle</option>
                      <option value="General Agriculture">General Agriculture</option>
                      <option value="Mixed Husbandry">Mixed Husbandry</option>
                    </select>
                  </div>

                  {/* Average Herd Size */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Est. Initial Herd Count</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      placeholder="e.g. 45"
                      value={estimatedCattle}
                      onChange={(e) => setEstimatedCattle(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Water Inflow */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Primary Water Inflow</label>
                    <select
                      value={waterSource}
                      onChange={(e) => setWaterSource(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors text-mud-900"
                    >
                      <option value="Well/Borehole">Well/Borehole</option>
                      <option value="River/Stream">River/Stream</option>
                      <option value="Rainwater Harvesting">Rainwater Harvesting</option>
                      <option value="Municipal Supply">Municipal Supply</option>
                    </select>
                  </div>

                  {/* Primary Phone */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Emergency Operator Line</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +254 700 000000"
                      value={farmPhone}
                      onChange={(e) => setFarmPhone(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Owner details section */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center pr-2"><div className="w-full border-t-2 border-mud-900/10" /></div>
                  <div className="relative flex justify-start"><span className="pr-4 bg-white text-[10px] font-black text-terracotta-500 uppercase tracking-[0.35em]">Owner Identity & Credentials</span></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Owner Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Owner Full Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. MARCUS AURELIUS"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value.toUpperCase())}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Owner Designation */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Designation / Official Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. PRINCIPAL PARTNER"
                      value={ownerDesignation}
                      onChange={(e) => setOwnerDesignation(e.target.value.toUpperCase())}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Owner Email Contact */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Owner Email Contact</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="e.g. owner@savanna.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Owner Personal Line */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2">Owner Direct Phone</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="e.g. +254 711 223344"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      className="w-full px-5 py-4 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {onboardingError && (
                  <div className="p-4 bg-terracotta-500/10 border-l-4 border-terracotta-500 text-[10px] font-black uppercase text-terracotta-500 tracking-widest">
                    {onboardingError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => handleSignOut()}
                    className="w-full sm:w-1/3 flex items-center justify-center space-x-2 px-6 py-5 bg-white border-4 border-mud-900 text-mud-900 font-black uppercase tracking-widest shadow-[6px_6px_0px_rgba(166,75,42,0.1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <span>Sign Out</span>
                  </button>

                  <button 
                    type="submit"
                    disabled={onboardingSubmitting}
                    className="w-full sm:w-2/3 flex items-center justify-center space-x-4 px-10 py-5 bg-mud-900 text-white font-black uppercase tracking-widest shadow-[8px_8px_0px_rgba(38,28,26,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                  >
                    {onboardingSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Register Farm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-[9px] font-bold text-mud-900/30 uppercase tracking-[0.4em]">
            This details your core farm name, location, size, and team.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-cream-100 font-sans flex text-mud-900 relative overflow-hidden">
      {/* Infrastructure Texture Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2664&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-[0.03] grayscale"
          alt=""
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-pattern opacity-[0.15]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#A64B2A08_1px,transparent_1px),linear-gradient(to_bottom,#A64B2A08_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="flex flex-1 h-screen relative z-10 w-full overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar-bg text-sidebar-text sticky top-0 h-screen z-50 border-r-8 border-terracotta-500 shadow-[20px_0px_60px_rgba(0,0,0,0.15)]">
        <div className="p-10 border-b border-sidebar-text/10 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-terracotta-500 flex items-center justify-center shadow-[4px_4px_0px_var(--sidebar-text)]">
              <Milk className="w-6 h-6 text-sidebar-text" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-serif italic tracking-tight uppercase leading-none truncate max-w-[160px]" title={profile?.farmDetails?.farmName || "SAVANNA"}>
                {profile?.farmDetails?.farmName || "SAVANNA"}
              </h1>
              <span className="text-[10px] font-bold tracking-[4px] opacity-40 uppercase block truncate max-w-[160px]">
                {"Savanna Farm"}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={`
                flex items-center space-x-4 px-8 py-5 text-[10px] font-black transition-all uppercase tracking-[0.3em] relative group
                ${location.pathname === item.path 
                  ? "bg-terracotta-500 text-white" 
                  : "hover:bg-white/5 text-sidebar-text/40 hover:text-white"}
              `}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'text-white' : 'text-terracotta-500'}`} />
              <span>{item.name}</span>
              {location.pathname === item.path && (
                <motion.div layoutId="navActive" className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-sidebar-text/10">
          <div className="bg-sidebar-text/5 p-6 border border-sidebar-text/10 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">System State</span>
              <div className="w-2 h-2 bg-leaf-500 rounded-full animate-pulse shadow-[0_0_8px_#5B6342]" />
            </div>
            <p className="text-[10px] font-mono opacity-60 leading-relaxed font-black uppercase tracking-tighter">NODE: SAV-420-TX</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex-shrink-0 flex h-20 sm:h-24 bg-cream-100 items-center px-4 sm:px-10 border-b border-mud-900/5 backdrop-blur-md ">
          <div className="flex-1 flex items-center space-x-3 sm:space-x-8 lg:space-x-12">
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 bg-mud-900 text-cream-100 rounded shadow-md">
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
            <div className="hidden sm:flex items-center space-x-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
              <Sunrise className="w-5 h-5 text-ochre-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dawn Shift Active</span>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-mud-900/20 text-[10px] font-black uppercase tracking-[0.2em]">
              <Timer className="w-4 h-4" />
              <span>UPTIME: 124H:42M</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-8 lg:space-x-10">
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 sm:p-3 bg-mud-900/5 dark:bg-white/5 text-mud-900 hover:bg-terracotta-500 hover:text-white dark:hover:bg-terracotta-500 transition-all rounded shadow-sm group"
              title={isDark ? "Switch to Day Shift" : "Switch to Night Shift"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-ochre-500 transition-transform group-hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-mud-900 group-hover:text-terracotta-500 group-hover:-translate-y-0.5 transition-all" />
              )}
            </button>

            <div className="hidden lg:flex items-center space-x-4 text-mud-900/30">
              <Search className="w-5 h-5 cursor-pointer hover:text-terracotta-500 transition-colors" />
              <Bell className="w-5 h-5 cursor-pointer hover:text-terracotta-500 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-5 pl-3 sm:pl-10 border-l border-mud-900/5">
              <div className="text-right flex flex-col max-w-[80px] sm:max-w-[150px] overflow-hidden">
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-mud-900 font-serif italic tracking-tight truncate">{profile?.displayName}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-terracotta-500 uppercase tracking-widest truncate">
                  {profile?.role}
                </span>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 border-2 border-mud-900 p-1 shadow-[3px_3px_0px_#D99125] sm:shadow-[4px_4px_0px_#D99125]">
                 <div className="w-full h-full bg-mud-900 flex items-center justify-center text-cream-100 font-black text-[10px] sm:text-xs uppercase">
                    {profile?.displayName?.[0]}
                 </div>
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16 w-full custom-scrollbar">
          <div className="max-w-screen-2xl mx-auto w-full">
            {children}
          </div>
        </section>

        {/* Floating Background Accent */}
        <div className="fixed bottom-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
           <LayoutDashboard className="w-96 h-96" />
        </div>
      </main>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-mud-900/80 backdrop-blur-sm z-[100] lg:hidden" />
            <motion.div initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar-bg text-sidebar-text z-[110] lg:hidden border-r-8 border-terracotta-500 p-10 flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-sidebar-text/10 pb-6">
                  <div>
                    <h1 className="text-3xl font-black font-serif italic uppercase tracking-tight truncate max-w-[180px]" title={profile?.farmDetails?.farmName || "SAVANNA"}>
                      {profile?.farmDetails?.farmName || "SAVANNA"}
                    </h1>
                    <span className="text-[9px] font-bold tracking-[3px] opacity-40 uppercase">
                      {"Savanna Farm"}
                    </span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)}><X className="w-8 h-8 hover:text-terracotta-500 transition-colors" /></button>
                </div>
                <nav className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 mb-6">
                  {navItems.map((item) => (
                    <Link 
                      key={item.path} 
                      to={item.path} 
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-6 p-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${location.pathname === item.path ? 'bg-terracotta-500 text-white' : 'text-sidebar-text/40 hover:bg-white/5 hover:text-white'}`}
                    >
                      <item.icon className="w-5 h-5 text-terracotta-500" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  </div>
);
};


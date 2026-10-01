export type Language = 'en' | 'am';

export interface Translations {
  // Brand & Header
  appTitle: string;
  appSubtitle: string;
  appDescription: string;
  offlinePcBadge: string;
  superAdmin: string;
  agentTerminal: string;
  callerBoard: string;
  activeAgent: string;
  balance: string;
  printCards: string;
  online: string;
  slow2g: string;
  offline: string;
  sync: string;
  syncSuccess: string;
  syncFailed: string;
  offlineSyncNotice: string;
  logOut: string;
  lightMode: string;
  nightMode: string;
  light: string;
  night: string;

  // Authentication & Login
  signIn: string;
  signingIn: string;
  username: string;
  password: string;
  enterUsername: string;
  enterPassword: string;
  signInToContinue: string;
  fillBothFields: string;
  invalidCredentials: string;
  demoCredentials: string;
  quickLoginAsAdmin: string;
  quickLoginAsAgent: string;
  adminCredentialsHint: string;
  agentCredentialsHint: string;

  // Caller View
  callNextBall: string;
  callingBall: string;
  autoCaller: string;
  autoCalling: string;
  callingSpeed: string;
  secondsPerBall: string;
  pause: string;
  resume: string;
  resetBoard: string;
  verifyCard: string;
  voice: string;
  voiceOn: string;
  voiceOff: string;
  totalCalled: string;
  remaining: string;
  recentCalls: string;
  startBingoGame: string;
  startingGame: string;
  noActiveGame: string;
  clickToStartInstruction: string;
  gameInProgress: string;
  officialWinnerAlert: string;
  pattern: string;
  prize: string;
  dismiss: string;
  showRoomCelebration: string;
  roomCelebrationActive: string;
  clickToViewOverlay: string;
  all75Called: string;
  insufficientBalance: string;
  gameFeeNotice: string;
  ballMasterBoard: string;
  resetConfirm: string;
  endGameConfirm: string;
  gameCompleted: string;

  // Bingo Winner Celebration Overlay
  bingoBadge: string;
  weHaveAWinner: string;
  villageRoomVerification: string;
  winnerVerifiedDescription: string;
  winningCardId: string;
  winningPattern: string;
  officialFixedCard: string;
  fireConfetti: string;
  replayFanfare: string;
  returnToBoard: string;
  fanfareMuted: string;
  fanfareActive: string;
  cardGridInspection: string;
  winningCalledNumbers: string;
  numbersMatched: string;
  gameId: string;
  concludeAndEnd: string;
  townshipPrize: string;
  officialVerification: string;
  muted: string;
  fanfare: string;
  winnerVerifiedDesc: string;
  officialPrintedCard: string;
  prizePool: string;
  grandPrize: string;
  gridInspection: string;
  matchedNumbersTitle: string;
  selectAgentPrompt: string;
  failedToStartGame: string;
  calledCount: string;
  gameReady: string;
  recentBalls: string;
  noBallsCalled: string;
  autoRunning: string;
  endGame: string;
  standardGrid: string;
  remainingCount: string;

  // Verification Modal
  verificationModalTitle: string;
  verificationDescription: string;
  enterCardIdLabel: string;
  cardIdPlaceholder: string;
  verifyButton: string;
  verifying: string;
  quickSamples: string;
  previewCelebration: string;
  celebrateOnScreen: string;
  confirmWinnerEndGame: string;
  recordingWinner: string;
  prizeAmountLabel: string;
  prizeNotesLabel: string;
  validBingoDetected: string;
  noWinningPattern: string;
  matchedCount: string;
  cancel: string;
  close: string;

  // Agent Terminal View
  agentViewTitle: string;
  quickCardSales: string;
  cardsSoldThisSession: string;
  registerAndIssue: string;
  cardId: string;
  registerCardBtn: string;
  startSessionBtn: string;
  availableCredits: string;
  topUpRequiredNotice: string;
  playerCardChecker: string;
  openChecker: string;
  quickAddCards: string;
  soldCardsList: string;
  noCardsSoldYet: string;
  clearSessionCards: string;

  // Admin View
  adminConsole: string;
  agentManagement: string;
  addNewAgent: string;
  assignPackage: string;
  topUpCredits: string;
  totalAgents: string;
  totalRevenue: string;
  gamesPlayed: string;
  agentName: string;
  location: string;
  phone: string;
  status: string;
  actions: string;
  active: string;
  deactivated: string;
  edit: string;
  deactivate: string;
  activate: string;
  gameSessionsHistory: string;
  exportPdf: string;
  registerNewAgent: string;
  registerNewAgentDesc: string;
  agentNameLabel: string;
  townshipLocation: string;
  contactPhone: string;
  pinCode: string;
  initialPackageAssignment: string;
  hardwareDeviceId: string;
  registerAndAssign: string;
  registering: string;
  assignGamePackage: string;
  choosePackageTier: string;
  customPackage: string;
  manualCreditsGames: string;
  packageName: string;
  credits: string;
  gamesAllowed: string;
  allocationNote: string;
  confirmPackageAssignment: string;
  assigningPackage: string;
  currentAgentBalance: string;
  playableGames: string;
  games: string;
  editAgentDetails: string;
  saveChanges: string;
  saving: string;
  operatorTip: string;
  quickCreditTopup: string;
  quickPackageAmounts: string;
  customCreditAmount: string;
  auditNoteReason: string;
  confirmAllocation: string;
  allocating: string;

  // Gamer Quantity & Winner Result Popups
  gamerQuantity: string;
  enterGamerQuantity: string;
  gamerCountLabel: string;
  capturedNumbers: string;
  insertCapturedNumbers: string;
  mustInsertHeldCardsWarning: string;
  insertCardsFirst: string;
  capturedCardsCount: string;
  quickRanges: string;
  enterCardNumbersPlaceholder: string;
  addCards: string;
  clearAll: string;
  notInCapturedWarning: string;
  inPlayCards: string;
  itsLate: string;
  itsLateDetail: string;
  thisNumberNotWinner: string;
  winner: string;
  congratulations: string;
  checkCardNumber: string;
  afterGameCheckDesc: string;
  afterGameCheck: string;
  liveBingoStage: string;
  live: string;
  paused: string;
  gameSession: string;
  noActiveGameDesc: string;

  // Drawn Numbers Entry Form (Batch & Progressive)
  drawNumbersTitle: string;
  progressiveEntry: string;
  batchInput: string;
  enterBallNumber: string;
  drawBallButton: string;
  batchInputPlaceholder: string;
  addBatchToSession: string;
  undoLastBall: string;
  numberAlreadyCalled: string;
  invalidNumberRange: string;
  readyToAddBatch: string;
  allBatchAlreadyCalled: string;
  clickBoardToDraw: string;
  ballsInCurrentSession: string;

  // Sound Check & Voice Announcement
  soundCheck: string;
  soundCheckActive: string;
  thisIsWinner: string;
  thisIsALate: string;
  thisIsNotWinner: string;

  // Auto Speed & Offline SQLite
  chooseAutoSpeed: string;
  autoNextIn: string;
  downloadSqliteDb: string;
  importSqliteDb: string;
  sqliteOfflineStorage: string;

  // Footer & Miscellaneous
  footerText: string;
  desktopDocs: string;
  printPhysicalCards: string;
  switchLanguage: string;
  english: string;
  amharic: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'EilaBingo System',
    appSubtitle: 'Offline-First PC',
    appDescription: 'Standard 75-Ball Village Bingo Station',
    offlinePcBadge: 'Offline-First PC',
    superAdmin: 'Super Admin',
    agentTerminal: 'Agent Terminal',
    callerBoard: 'Caller Live Board',
    activeAgent: 'Active Agent:',
    balance: 'Balance',
    printCards: 'Print Cards',
    online: 'Online',
    slow2g: '2G',
    offline: 'Offline',
    sync: 'Sync',
    syncSuccess: 'Sync completed successfully with Central Atlas!',
    syncFailed: 'Sync failed. Please check connection.',
    offlineSyncNotice: 'Cannot sync while offline. Switch network mode to Online first.',
    logOut: 'Log Out',
    lightMode: 'Light Mode',
    nightMode: 'Night Mode',
    light: 'Light',
    night: 'Night',

    signIn: 'Sign In',
    signingIn: 'Signing in...',
    username: 'Username',
    password: 'Password',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    signInToContinue: 'Sign in to continue',
    fillBothFields: 'Please enter both username and password.',
    invalidCredentials: 'Invalid username or password.',
    demoCredentials: 'Quick Access Credentials',
    quickLoginAsAdmin: 'Super Admin',
    quickLoginAsAgent: 'Station Agent',
    adminCredentialsHint: 'admin / admin123',
    agentCredentialsHint: 'AGENT-101 / 1234',

    callNextBall: 'Call Next Ball',
    callingBall: 'Calling...',
    autoCaller: 'Auto Caller',
    autoCalling: 'Auto Calling...',
    callingSpeed: 'Speed',
    secondsPerBall: 's/ball',
    pause: 'Pause',
    resume: 'Resume',
    resetBoard: 'Reset Board',
    verifyCard: 'Verify Card',
    voice: 'Voice',
    voiceOn: 'Voice On',
    voiceOff: 'Voice Off',
    totalCalled: 'Total Called',
    remaining: 'Remaining',
    recentCalls: 'Recent Calls',
    startBingoGame: 'Start Bingo Game',
    startingGame: 'Starting Round...',
    noActiveGame: 'No Game In Progress',
    clickToStartInstruction: 'Select an active agent and press Start Bingo Game to launch a new 75-ball session.',
    gameInProgress: 'Round In Progress',
    officialWinnerAlert: 'OFFICIAL WINNER VERIFIED',
    pattern: 'Pattern',
    prize: 'Prize',
    dismiss: 'Dismiss',
    showRoomCelebration: 'Show Room Celebration Overlay 🎉',
    roomCelebrationActive: 'Room Celebration Active',
    clickToViewOverlay: 'Click to View Celebration Overlay',
    all75Called: 'All 75 Bingo numbers have been called!',
    insufficientBalance: 'Insufficient agent credit balance',
    gameFeeNotice: 'Fee: 50 CR per game',
    ballMasterBoard: 'Live 75-Ball Master Board',
    resetConfirm: 'Are you sure you want to end this game and reset the caller board?',
    endGameConfirm: 'Conclude Game & End Session',
    gameCompleted: 'Game concluded successfully.',

    bingoBadge: '★ B-I-N-G-O ! ★',
    weHaveAWinner: 'We Have A Winner!',
    villageRoomVerification: 'Official Village Room Verification',
    winnerVerifiedDescription: 'Physical card numbers checked against live caller roll and verified 100% valid!',
    winningCardId: 'Winning Physical Card ID',
    winningPattern: 'Winning Line / Pattern',
    officialFixedCard: 'OFFICIAL FIXED PRINTED CARD',
    fireConfetti: 'Fire Confetti Cannon! 🎉',
    replayFanfare: 'Replay Fanfare 🎺',
    returnToBoard: 'Return to Caller Board',
    fanfareMuted: 'Muted',
    fanfareActive: 'Fanfare',
    cardGridInspection: 'Card Grid Inspection',
    winningCalledNumbers: 'Winning Called Numbers on this Line:',
    numbersMatched: 'numbers matched',
    gameId: 'Game ID',
    concludeAndEnd: 'Conclude Game & End Session',
    townshipPrize: 'Township Grand Bingo Prize',
    officialVerification: 'Official Village Room Verification',
    muted: 'Muted',
    fanfare: 'Fanfare',
    winnerVerifiedDesc: 'Physical card numbers checked against live caller roll and verified 100% valid!',
    officialPrintedCard: 'Official Fixed Printed Card',
    prizePool: 'Prize Pool',
    grandPrize: 'Township Grand Bingo Prize',
    gridInspection: 'Card Grid Inspection (5x5)',
    matchedNumbersTitle: 'Winning Called Numbers on this Line:',
    selectAgentPrompt: 'Please select an agent terminal first',
    failedToStartGame: 'Failed to start game',
    calledCount: 'balls called',
    gameReady: 'Game ready to start',
    recentBalls: 'Recent Balls Called',
    noBallsCalled: 'No balls called yet',
    autoRunning: 'Auto-Calling in Progress...',
    endGame: 'End Game',
    standardGrid: '75-Ball Master Grid',
    remainingCount: 'remaining',

    verificationModalTitle: 'Winner Card Verification',
    verificationDescription: 'Enter the physical printed card ID to verify against caller draws.',
    enterCardIdLabel: 'Physical Card ID to Verify',
    cardIdPlaceholder: 'e.g. CARD-0001',
    verifyButton: 'Verify Card',
    verifying: 'Verifying...',
    quickSamples: 'Quick Samples:',
    previewCelebration: 'Preview Celebration',
    celebrateOnScreen: 'Celebrate on Room Screen 🎉',
    confirmWinnerEndGame: 'Confirm Winner & End Game',
    recordingWinner: 'Recording Winner...',
    prizeAmountLabel: 'Prize Amount in Credits (Optional)',
    prizeNotesLabel: 'Prize Notes / Description (Optional)',
    validBingoDetected: 'VALID BINGO DETECTED!',
    noWinningPattern: 'NO WINNING PATTERN DETECTED',
    matchedCount: 'matched numbers out of 25 cells',
    cancel: 'Cancel',
    close: 'Close',

    agentViewTitle: 'Agent Terminal',
    quickCardSales: 'Quick Card Sales',
    cardsSoldThisSession: 'Cards Sold This Session',
    registerAndIssue: 'Register & Issue Cards',
    cardId: 'Card ID',
    registerCardBtn: 'Register Card',
    startSessionBtn: 'Start Bingo Game (50 CR)',
    availableCredits: 'Available Credits',
    topUpRequiredNotice: 'Credit balance is low. Contact Admin to purchase game packages.',
    playerCardChecker: 'Player Card Checker',
    openChecker: 'Open Card Checker',
    quickAddCards: 'Quick Add Pre-Printed Cards',
    soldCardsList: 'Sold Cards for Current Round',
    noCardsSoldYet: 'No cards registered yet for this round.',
    clearSessionCards: 'Clear Session Cards',

    adminConsole: 'Super Admin Console',
    agentManagement: 'Agent Management',
    addNewAgent: 'Add New Agent',
    assignPackage: 'Assign Package',
    topUpCredits: 'Top-up Credits',
    totalAgents: 'Total Agents',
    totalRevenue: 'Total Revenue',
    gamesPlayed: 'Games Played',
    agentName: 'Agent Name',
    location: 'Location',
    phone: 'Phone',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    deactivated: 'Deactivated',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    gameSessionsHistory: 'Game Sessions History',
    exportPdf: 'Generate & Export Cards PDF',
    registerNewAgent: 'Register New Agent',
    registerNewAgentDesc: 'Add local operator & assign initial game package',
    agentNameLabel: 'Agent / Operator Name',
    townshipLocation: 'Township / Location',
    contactPhone: 'Contact Phone',
    pinCode: 'Local 4-Digit PIN',
    initialPackageAssignment: 'Initial Game Package Assignment',
    hardwareDeviceId: 'Hardware Device ID',
    registerAndAssign: 'Register & Assign Package',
    registering: 'Registering...',
    assignGamePackage: 'Assign Game Package',
    choosePackageTier: 'Choose Package Tier',
    customPackage: 'Custom Package',
    manualCreditsGames: 'Manual credits & games',
    packageName: 'Package Name',
    credits: 'Credits',
    gamesAllowed: 'Games Allowed',
    allocationNote: 'Allocation Note',
    confirmPackageAssignment: 'Confirm Package Assignment',
    assigningPackage: 'Assigning Package...',
    currentAgentBalance: 'Current Agent Balance',
    playableGames: 'Playable Games',
    games: 'Games',
    editAgentDetails: 'Edit Agent Details',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    operatorTip: 'Village Operator Tip',
    quickCreditTopup: 'Quick Credit Top-up',
    quickPackageAmounts: 'Quick Package Amounts',
    customCreditAmount: 'Custom Credit Amount',
    auditNoteReason: 'Audit Note / Reason',
    confirmAllocation: 'Confirm Allocation',
    allocating: 'Allocating...',

    gamerQuantity: 'Number of Gamers',
    enterGamerQuantity: 'Insert number of participating players (e.g. 5, 10, 20)',
    gamerCountLabel: 'Gamers / Players',
    capturedNumbers: 'Captured Numbers',
    insertCapturedNumbers: 'Insert Player Card Numbers Hold (Mandatory)',
    mustInsertHeldCardsWarning: 'Mandatory: You must insert at least one player held card number before starting the game.',
    insertCardsFirst: 'Insert Held Cards First to Start',
    capturedCardsCount: 'Held Cards in Play',
    quickRanges: 'Quick Presets / Ranges',
    enterCardNumbersPlaceholder: 'Enter card numbers (e.g. 5, 12, 18 or 1-10)',
    addCards: 'Add Cards',
    clearAll: 'Clear All',
    notInCapturedWarning: 'Notice: This card was not captured in this game round.',
    inPlayCards: 'Captured Cards in Play',
    itsLate: "It's late.",
    itsLateDetail: 'Winning line was completed on an earlier ball. According to bingo rules, this is a late call.',
    thisNumberNotWinner: 'This number is not winner',
    winner: 'Winner!',
    congratulations: 'Congratulations!',
    checkCardNumber: 'Check Card Number',
    afterGameCheckDesc: 'Verify any physical card during or after the game',
    afterGameCheck: 'After Game Check Number',
    liveBingoStage: 'Live Bingo Caller Stage',
    live: 'Live',
    paused: 'Paused',
    gameSession: 'Game Session',
    noActiveGameDesc: 'Start a game session to call 75-ball numbers with real-time verification',

    // Drawn Numbers Entry Form (Batch & Progressive)
    drawNumbersTitle: 'Drawn Numbers Entry',
    progressiveEntry: 'Progressive (Single Ball)',
    batchInput: 'Batch Input (Multiple Balls)',
    enterBallNumber: 'Enter Ball (1-75)',
    drawBallButton: 'Draw Ball',
    batchInputPlaceholder: 'Paste or type numbers (e.g. 5, 12, 23, 44, 58 or range 1-10)',
    addBatchToSession: 'Add Batch to Session',
    undoLastBall: 'Undo Last Ball',
    numberAlreadyCalled: 'Already called in this session',
    invalidNumberRange: 'Enter valid number between 1 and 75',
    readyToAddBatch: 'New balls ready to add',
    allBatchAlreadyCalled: 'All entered numbers are already called in this session',
    clickBoardToDraw: 'Click any board number to quickly draw it',
    ballsInCurrentSession: 'Balls in Session',

    // Sound Check & Voice Announcement
    soundCheck: 'Sound Check',
    soundCheckActive: 'Voice Announcement ON',
    thisIsWinner: 'This is winner',
    thisIsALate: 'This is a late',
    thisIsNotWinner: 'This is not winner',

    // Auto Speed & Offline SQLite
    chooseAutoSpeed: 'Auto Call Interval (1s - 3s)',
    autoNextIn: 'Next ball in',
    downloadSqliteDb: 'Download SQLite DB (.sqlite)',
    importSqliteDb: 'Import SQLite DB (.sqlite)',
    sqliteOfflineStorage: 'Offline SQLite Storage (Embedded sql.js)',

    footerText: 'Standard Village Bingo System • 75-Ball Reusable Cards',
    desktopDocs: 'Desktop & Offline PC Docs',
    printPhysicalCards: 'Print Physical Cards',
    switchLanguage: 'Language / ቋንቋ',
    english: 'English',
    amharic: 'አማርኛ',
  },

  am: {
    appTitle: 'የገጠር ቢንጎ ሲስተም',
    appSubtitle: 'ኦፍላይን ፒሲ ሲስተም',
    appDescription: 'የ 75 ኳስ የገጠር ቢንጎ ጨዋታ መድረክ',
    offlinePcBadge: 'ኦፍላይን ፒሲ ሲስተም',
    superAdmin: 'ዋና አስተዳዳሪ',
    agentTerminal: 'የወኪል ተርሚናል',
    callerBoard: 'የጠሪው የቀጥታ ሰሌዳ',
    activeAgent: 'ንቁ ወኪል:',
    balance: 'ቀሪ ሂሳብ',
    printCards: 'ካርዶችን አትም',
    online: 'ኦንላይን',
    slow2g: '2ጂ',
    offline: 'ኦፍላይን',
    sync: 'አመሳስል',
    syncSuccess: 'ከማዕከላዊ ሞንጎዲቢ አትላስ ጋር በተሳካ ሁኔታ ተመሳስሏል!',
    syncFailed: 'ማመሳሰል አልተሳካም። እባክዎ ግንኙነትዎን ያረጋግጡ።',
    offlineSyncNotice: 'ኦፍላይን ላይ እያሉ ማመሳሰል አይቻልም። መጀመሪያ ወደ ኦንላይን ይቀይሩ።',
    logOut: 'ውጣ',
    lightMode: 'የቀን ሁነታ',
    nightMode: 'የሌሊት ሁነታ',
    light: 'ቀን',
    night: 'ሌሊት',

    signIn: 'ግባ',
    signingIn: 'በመግባት ላይ...',
    username: 'የተጠቃሚ ስም',
    password: 'የይለፍ ቃል',
    enterUsername: 'የተጠቃሚ ስም ያስገቡ',
    enterPassword: 'የይለፍ ቃል ያስገቡ',
    signInToContinue: 'ለመቀጠል ይግቡ',
    fillBothFields: 'እባክዎ የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ።',
    invalidCredentials: 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል።',
    demoCredentials: 'ፈጣን የመግቢያ መለያዎች',
    quickLoginAsAdmin: 'ዋና አስተዳዳሪ',
    quickLoginAsAgent: 'የጣቢያ ወኪል',
    adminCredentialsHint: 'admin / admin123',
    agentCredentialsHint: 'AGENT-101 / 1234',

    callNextBall: 'ቀጣዩን ኳስ ጥራ',
    callingBall: 'በመጥራት ላይ...',
    autoCaller: 'ራስ-ሰር ጠሪ',
    autoCalling: 'በራስ-ሰር በመጥራት ላይ...',
    callingSpeed: 'ፍጥነት',
    secondsPerBall: 'ሰከንድ/ኳስ',
    pause: 'አፍታ አቁም',
    resume: 'ቀጥል',
    resetBoard: 'ሰሌዳውን አድስ',
    verifyCard: 'ካርድ አረጋግጥ',
    voice: 'ድምጽ',
    voiceOn: 'ድምጽ በርቷል',
    voiceOff: 'ድምጽ ጠፍቷል',
    totalCalled: 'የተጠሩ ኳሶች',
    remaining: 'የቀሩ ኳሶች',
    recentCalls: 'የቅርብ ጥሪዎች',
    startBingoGame: 'የቢንጎ ጨዋታ ጀምር',
    startingGame: 'ዙር በመጀመር ላይ...',
    noActiveGame: 'የሚካሄድ ጨዋታ የለም',
    clickToStartInstruction: 'ወኪል ይምረጡ እና አዲስ የ75-ኳስ ቢንጎ ለመጀመር «የቢንጎ ጨዋታ ጀምር» የሚለውን ይጫኑ።',
    gameInProgress: 'ጨዋታው በመካሄድ ላይ ነው',
    officialWinnerAlert: 'ይፋዊ አሸናፊ ተረጋግጧል',
    pattern: 'ቅርጽ / መስመር',
    prize: 'ሽልማት',
    dismiss: 'አስወግድ',
    showRoomCelebration: 'የክፍል ማክበሪያውን አሳይ 🎉',
    roomCelebrationActive: 'የክፍል አከባበር ንቁ ነው',
    clickToViewOverlay: 'ማክበሪያውን ለማየት ይጫኑ',
    all75Called: 'ሁሉም 75 የቢንጎ ቁጥሮች ተጠርተዋል!',
    insufficientBalance: 'የወኪሉ ሂሳብ በቂ አይደለም',
    gameFeeNotice: 'የጨዋታ ክፍያ: 50 ክሬዲት',
    ballMasterBoard: 'የቀጥታ 75-ኳስ ማስተር ሰሌዳ',
    resetConfirm: 'እርግጠኛ ነዎት ይህን ጨዋታ አጠናቀው ሰሌዳውን ማደስ ይፈልጋሉ?',
    endGameConfirm: 'ጨዋታውን ጨርስ እና አጠናቅቅ',
    gameCompleted: 'ጨዋታው በተሳካ ሁኔታ ተጠናቋል።',

    bingoBadge: '★ ቢ - ን - ጎ ! ★',
    weHaveAWinner: 'አሸናፊ ተገኝቷል!',
    villageRoomVerification: 'ይፋዊ የክፍል ማረጋገጫ',
    winnerVerifiedDescription: 'የታተመው ካርድ ቁጥሮች በቀጥታ ጥሪ ተረጋግጠው 100% ትክክለኛ ሆነዋል!',
    winningCardId: 'አሸናፊ የታተመ ካርድ ቁጥር',
    winningPattern: 'አሸናፊ መስመር / ቅርጽ',
    officialFixedCard: 'ይፋዊ ቋሚ የታተመ ካርድ',
    fireConfetti: 'ኮንፈቲ ይተኩሱ! 🎉',
    replayFanfare: 'የድል ዜማ እንደገና አጫውት 🎺',
    returnToBoard: 'ወደ ሰሌዳው ተመለስ',
    fanfareMuted: 'ድምጽ አልባ',
    fanfareActive: 'የድል ዜማ',
    cardGridInspection: 'የካርድ ፍተሻ (5x5)',
    winningCalledNumbers: 'በዚህ መስመር የተጠሩ አሸናፊ ቁጥሮች:',
    numbersMatched: 'ቁጥሮች ተገጥመዋል',
    gameId: 'የጨዋታ መለያ',
    concludeAndEnd: 'ጨዋታውን ጨርስ',
    townshipPrize: 'የከተማው ታላቅ የቢንጎ ሽልማት',
    officialVerification: 'ይፋዊ የክፍል ማረጋገጫ',
    muted: 'ድምጽ አልባ',
    fanfare: 'የድል ዜማ',
    winnerVerifiedDesc: 'የታተመው ካርድ ቁጥሮች በቀጥታ ጥሪ ተረጋግጠው 100% ትክክለኛ ሆነዋል!',
    officialPrintedCard: 'ይፋዊ ቋሚ የታተመ ካርድ',
    prizePool: 'የሽልማት ገንዳ',
    grandPrize: 'የከተማው ታላቅ የቢንጎ ሽልማት',
    gridInspection: 'የካርድ ፍተሻ (5x5)',
    matchedNumbersTitle: 'በዚህ መስመር የተጠሩ አሸናፊ ቁጥሮች:',
    selectAgentPrompt: 'እባክዎ መጀመሪያ የወኪል ተርሚናል ይምረጡ',
    failedToStartGame: 'ጨዋታውን መጀመር አልተሳካም',
    calledCount: 'የተጠሩ ኳሶች',
    gameReady: 'ጨዋታው ለመጀመር ዝግጁ ነው',
    recentBalls: 'የቅርብ ጊዜ የተጠሩ ኳሶች',
    noBallsCalled: 'እስካሁን የተጠራ ኳስ የለም',
    autoRunning: 'በራስ-ሰር በመጥራት ላይ...',
    endGame: 'ጨዋታ አጠናቅቅ',
    standardGrid: '75-ኳስ ማስተር ሰሌዳ',
    remainingCount: 'የቀሩ',

    verificationModalTitle: 'የአሸናፊ ካርድ ማረጋገጫ',
    verificationDescription: 'የታተመውን ካርድ መታወቂያ አስገብተው ከተጠሩት ቁጥሮች ጋር ያረጋግጡ።',
    enterCardIdLabel: 'የሚረጋገጠው ካርድ ቁጥር',
    cardIdPlaceholder: 'ለምሳሌ CARD-0001',
    verifyButton: 'ካርድ አረጋግጥ',
    verifying: 'በማረጋገጥ ላይ...',
    quickSamples: 'ፈጣን ናሙናዎች:',
    previewCelebration: 'አከባበሩን ሞክር',
    celebrateOnScreen: 'በማያ ገጽ አክብር 🎉',
    confirmWinnerEndGame: 'አሸናፊውን መዝግብ እና ጨዋታውን ጨርስ',
    recordingWinner: 'አሸናፊውን በመመዝገብ ላይ...',
    prizeAmountLabel: 'የሽልማት መጠን በክሬዲት (አማራጭ)',
    prizeNotesLabel: 'የሽልማት ማስታወሻ (አማራጭ)',
    validBingoDetected: 'ትክክለኛ ቢንጎ ተረጋግጧል!',
    noWinningPattern: 'ምንም አሸናፊ መስመር አልተገኘም',
    matchedCount: 'ከ25 ቁጥሮች ውስጥ ተገጥመዋል',
    cancel: 'ሰርዝ',
    close: 'ዝጋ',

    agentViewTitle: 'የወኪል ተርሚናል',
    quickCardSales: 'ፈጣን የካርድ ሽያጭ',
    cardsSoldThisSession: 'በዚህ ዙር የተሸጡ ካርዶች',
    registerAndIssue: 'ካርዶችን መዝግብ እና ሽጥ',
    cardId: 'የካርድ ቁጥር',
    registerCardBtn: 'ካርድ መዝግብ',
    startSessionBtn: 'የቢንጎ ጨዋታ ጀምር (50 ክሬዲት)',
    availableCredits: 'ያለዎት ክሬዲት',
    topUpRequiredNotice: 'ክሬዲትዎ ዝቅተኛ ነው። ተጨማሪ ጨዋታ ለማስተናገድ አስተዳዳሪውን ያነጋግሩ።',
    playerCardChecker: 'የተጫዋች ካርድ መመርመሪያ',
    openChecker: 'መመርመሪያውን ክፈት',
    quickAddCards: 'የታተሙ ካርዶችን በፍጥነት ጨምር',
    soldCardsList: 'ለዚህ ዙር የተመዘገቡ ካርዶች',
    noCardsSoldYet: 'ለዚህ ዙር እስካሁን የተመዘገበ ካርድ የለም።',
    clearSessionCards: 'የዙሩን ካርዶች አጽዳ',

    adminConsole: 'የዋና አስተዳዳሪ ሰሌዳ',
    agentManagement: 'የወኪሎች አስተዳደር',
    addNewAgent: 'አዲስ ወኪል ጨምር',
    assignPackage: 'ፓኬጅ መድብ',
    topUpCredits: 'ክሬዲት ሙላ',
    totalAgents: 'ጠቅላላ ወኪሎች',
    totalRevenue: 'ጠቅላላ ገቢ',
    gamesPlayed: 'የተደረጉ ጨዋታዎች',
    agentName: 'የወኪል ስም',
    location: 'አድራሻ / አካባቢ',
    phone: 'ስልክ ቁጥር',
    status: 'ሁኔታ',
    actions: 'ተግባራት',
    active: 'ንቁ',
    deactivated: 'የቦዘነ',
    edit: 'አርትዕ',
    deactivate: 'አቦዝን',
    activate: 'አንቃ',
    gameSessionsHistory: 'የጨዋታ ታሪክ',
    exportPdf: 'ካርዶችን በፒዲኤፍ (PDF) አትም',
    registerNewAgent: 'አዲስ ወኪል መዝግብ',
    registerNewAgentDesc: 'የአካባቢውን ወኪል ያስመዝግቡ እና የመጀመሪያ የጨዋታ ጥቅል ይመድቡ',
    agentNameLabel: 'የወኪል / አስተናጋጅ ስም',
    townshipLocation: 'ከተማ / የአካባቢ አድራሻ',
    contactPhone: 'የስልክ ቁጥር',
    pinCode: 'የወኪል 4-አሃዝ ፒን (PIN)',
    initialPackageAssignment: 'የመጀመሪያ የጨዋታ ጥቅል ምደባ',
    hardwareDeviceId: 'የሃርድዌር መለያ (Device ID)',
    registerAndAssign: 'ወኪሉን መዝግብ እና ጥቅል መድብ',
    registering: 'በመመዝገብ ላይ...',
    assignGamePackage: 'የጨዋታ ጥቅል መድብ',
    choosePackageTier: 'የጥቅል ደረጃ ይምረጡ',
    customPackage: 'ብጁ ጥቅል',
    manualCreditsGames: 'የክሬዲትና የጨዋታዎች ብዛት በራስዎ ይወስኑ',
    packageName: 'የጥቅል ስም',
    credits: 'ክሬዲት',
    gamesAllowed: 'የተፈቀዱ ጨዋታዎች',
    allocationNote: 'የምደባ ማስታወሻ',
    confirmPackageAssignment: 'የጥቅል ምደባውን አረጋግጥ',
    assigningPackage: 'ጥቅሉን በመመደብ ላይ...',
    currentAgentBalance: 'የወኪሉ ወቅታዊ ቀሪ ሂሳብ',
    playableGames: 'መጫወት የሚቻሉ ጨዋታዎች',
    games: 'ጨዋታዎች',
    editAgentDetails: 'የወኪል መረጃ አርትዕ',
    saveChanges: 'ለውጦችን መዝግብ',
    saving: 'በመመዝገብ ላይ...',
    operatorTip: 'የአስተናጋጅ ጠቃሚ ምክር',
    quickCreditTopup: 'ፈጣን ክሬዲት መሙያ',
    quickPackageAmounts: 'የፈጣን ጥቅል መጠኖች',
    customCreditAmount: 'ብጁ የክሬዲት መጠን',
    auditNoteReason: 'የምደባ ምክንያት / ማስታወሻ',
    confirmAllocation: 'ክሬዲት ምደባውን አረጋግጥ',
    allocating: 'በመመደብ ላይ...',

    gamerQuantity: 'የተጫዋቾች ብዛት',
    enterGamerQuantity: 'የተሳታፊ ተጫዋቾችን ብዛት ያስገቡ (ለምሳሌ 5, 10, 20)',
    gamerCountLabel: 'ተጫዋቾች',
    capturedNumbers: 'የተያዙ ቁጥሮች',
    insertCapturedNumbers: 'የተያዙ የካርድ ቁጥሮችን ያስገቡ (ግዴታ)',
    mustInsertHeldCardsWarning: 'ግዴታ፡ ጨዋታውን ከመጀመርዎ በፊት ቢያንስ አንድ ተጫዋች የያዘውን የካርድ ቁጥር ማስገባት አለብዎት።',
    insertCardsFirst: 'ጨዋታ ለመጀመር መጀመሪያ የተያዙ ካርዶችን ያስገቡ',
    capturedCardsCount: 'በጨዋታው ውስጥ ያሉ የተያዙ ካርዶች',
    quickRanges: 'ፈጣን የካርድ ክልሎች',
    enterCardNumbersPlaceholder: 'የካርድ ቁጥሮችን ያስገቡ (ለምሳሌ 5, 12, 18 ወይም 1-10)',
    addCards: 'ካርዶችን ጨምር',
    clearAll: 'ሁሉንም አጥፋ',
    notInCapturedWarning: 'ማሳሰቢያ፡ ይህ ካርድ ለዚህ ዙር ከተያዙት ውስጥ አልተመዘገበም።',
    inPlayCards: 'በጨዋታው ውስጥ ያሉ የተያዙ ካርዶች',
    itsLate: 'አርፍደዋል (ዘግይቷል)',
    itsLateDetail: 'የቢንጎ መስመሩ የተሟላው በቀደመ ኳስ ላይ ነበር። በቢንጎ ህግ መሰረት ጨዋታው ከቀጠለ ጥሪው ዘግይቷል።',
    thisNumberNotWinner: 'ይህ ቁጥር አሸናፊ አይደለም',
    winner: 'አሸናፊ!',
    congratulations: 'እንኳን ደስ አለዎት!',
    checkCardNumber: 'የካርድ ቁጥር ፈትሽ',
    afterGameCheckDesc: 'ከጨዋታው በኋላ ወይም በጨዋታው ወቅት ማንኛውንም ካርድ ፈትሽ',
    afterGameCheck: 'ከጨዋታ በኋላ ካርድ ፈትሽ',
    liveBingoStage: 'የቀጥታ ቢንጎ ጠሪ መድረክ',
    live: 'በሂደት ላይ',
    paused: 'ቆሟል',
    gameSession: 'የጨዋታ ክፍለ-ጊዜ',
    noActiveGameDesc: '75 ኳሶችን ለመጥራትና አሸናፊዎችን ለማረጋገጥ አዲስ ጨዋታ ይጀምሩ',

    // Drawn Numbers Entry Form (Batch & Progressive)
    drawNumbersTitle: 'የወጡ ኳሶች ማስገቢያ',
    progressiveEntry: 'ተከታታይ (ነጠላ ኳስ)',
    batchInput: 'የጅምላ ማስገቢያ (ብዙ ኳሶች)',
    enterBallNumber: 'የኳስ ቁጥር (1-75)',
    drawBallButton: 'ኳስ አስገባ',
    batchInputPlaceholder: 'ቁጥሮችን ይለጥፉ ወይም ይተይቡ (ለምሳሌ 5, 12, 23, 44, 58 ወይም 1-10)',
    addBatchToSession: 'ሁሉንም ወደ ጨዋታው አስገባ',
    undoLastBall: 'የመጨረሻውን ኳስ መልስ',
    numberAlreadyCalled: 'ይህ ቁጥር አስቀድሞ በዚህ ዙር ወጥቷል',
    invalidNumberRange: 'ትክክለኛ ቁጥር ከ 1 እስከ 75 ያስገቡ',
    readyToAddBatch: 'ለመጨመር ዝግጁ የሆኑ አዳዲስ ኳሶች',
    allBatchAlreadyCalled: 'ያስገቧቸው ቁጥሮች በሙሉ አስቀድመው ወጥተዋል',
    clickBoardToDraw: 'ማንኛውንም ቁጥር በፍጥነት ለማውጣት ሰሌዳው ላይ ይጫኑ',
    ballsInCurrentSession: 'በዚህ ዙር የወጡ ኳሶች',

    // Sound Check & Voice Announcement
    soundCheck: 'የድምፅ ፍተሻ (Sound Check)',
    soundCheckActive: 'የድምፅ ማረጋገጫ በርቷል',
    thisIsWinner: 'ይህ አሸናፊ ነው (This is winner)',
    thisIsALate: 'ይህ የዘገየ ነው (This is a late)',
    thisIsNotWinner: 'ይህ አሸናፊ አይደለም (This is not winner)',

    // Auto Speed & Offline SQLite
    chooseAutoSpeed: 'የራስ-ሰር ጥሪ ፍጥነት (ከ1 እስከ 3 ሰከንድ)',
    autoNextIn: 'ቀጣይ ኳስ በ',
    downloadSqliteDb: 'የ SQLite ዳታቤዝ ፋይል አውርድ (.sqlite)',
    importSqliteDb: 'የ SQLite ዳታቤዝ ፋይል አስገባ',
    sqliteOfflineStorage: 'ከመስመር ውጭ SQLite ዳታቤዝ (sql.js)',

    footerText: 'የ 75 ኳስ የገጠር ቢንጎ ሲስተም • ቋሚ የታተሙ ካርዶች',
    desktopDocs: 'የዴስክቶፕ እና ኦፍላይን መመሪያ',
    printPhysicalCards: 'የታተሙ ካርዶችን አትም',
    switchLanguage: 'ቋንቋ / Language',
    english: 'English',
    amharic: 'አማርኛ',
  },
};

/**
 * Maps English pattern names to Amharic description
 */
export function translatePattern(patternName: string, lang: Language): string {
  if (lang === 'en' || !patternName) return patternName;

  if (patternName.includes('Horizontal Line')) {
    return patternName.replace('Horizontal Line', 'አግድም መስመር').replace('Row', 'ረድፍ');
  }
  if (patternName.includes('Vertical Line')) {
    return patternName.replace('Vertical Line', 'ቀጥታ መስመር').replace('Column', 'አምድ');
  }
  if (patternName.includes('Diagonal')) {
    return patternName
      .replace('Diagonal', 'ሰያፍ መስመር')
      .replace('Top-Left to Bottom-Right', 'ከግራ ወደ ቀኝ')
      .replace('Top-Right to Bottom-Left', 'ከቀኝ ወደ ግራ');
  }
  if (patternName.includes('Four Corners')) {
    return 'አራቱ ማዕዘናት';
  }
  if (patternName.includes('Full Card Blackout') || patternName.includes('Coverall')) {
    return 'ሙሉ ካርድ (ብላክአውት)';
  }
  if (patternName.includes('Postage Stamp')) {
    return 'ፖስታ ቴምብር';
  }
  if (patternName.includes('Plus Cross')) {
    return 'መስቀል ቅርጽ (+)';
  }
  if (patternName.includes('Valid Bingo Line')) {
    return 'ትክክለኛ የቢንጎ መስመር';
  }
  return patternName;
}

/**
 * Phonetic pronunciation of Bingo letters in Amharic
 */
export function getAmharicLetterPhonetic(letter: string): string {
  switch (letter?.toUpperCase()) {
    case 'B':
      return 'ቢ';
    case 'I':
      return 'አይ';
    case 'N':
      return 'ኤን';
    case 'G':
      return 'ጂ';
    case 'O':
      return 'ኦ';
    default:
      return letter;
  }
}

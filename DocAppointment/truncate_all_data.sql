-- DANGEROUS: Wipes all clinic data
TRUNCATE TABLE 
    "Tokens", 
    "DailyQueues", 
    "Ratings", 
    "ChatSessions", 
    "MessageLogs", 
    "Patients", 
    "Sessions", 
    "Doctors", 
    "Staff", 
    "Branches", 
    "Organizations",
    "SystemSettings"
RESTART IDENTITY CASCADE;

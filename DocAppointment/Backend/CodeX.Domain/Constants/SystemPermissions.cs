namespace CodeX.Domain.Constants
{
    public static class SystemPermissions
    {
        public static class Modules
        {
            public const string Queue = "Queue";
            public const string Patients = "Patients";
            public const string Staff = "Staff";
            public const string Pharmacy = "Pharmacy";
            public const string Settings = "Settings";
            public const string Sessions = "Sessions";
            public const string Analytics = "Analytics";
            public const string DoctorDesk = "DoctorDesk";
            public const string Branches = "Branches";
            public const string Organizations = "Organizations";
            public const string Doctors = "Doctors";
        }

        public static class Queue
        {
            public const string View = "Queue.View";
            public const string AddPatient = "Queue.AddPatient";
            public const string CallNext = "Queue.CallNext";
            public const string CancelOfflinePatient = "Queue.CancelOfflinePatient";
            
            // New Granular Permissions
            public const string EndSession = "Queue.EndSession";
            public const string CompleteToken = "Queue.CompleteToken";
            public const string SkipToken = "Queue.SkipToken";
            public const string RestoreToken = "Queue.RestoreToken";
            public const string SendAlert = "Queue.SendAlert";
            public const string MarkDoctorArrived = "Queue.MarkDoctorArrived";
            public const string EditPatient = "Queue.EditPatient";
            public const string CancelToken = "Queue.CancelToken";
        }

        public static class Sessions
        {
            public const string View = "Sessions.View";
            public const string Add = "Sessions.Add";
            public const string Edit = "Sessions.Edit";
            public const string Delete = "Sessions.Delete";
        }

        public static class Analytics
        {
            public const string View = "Analytics.View";
        }

        public static class DoctorDesk
        {
            public const string View = "DoctorDesk.View";
        }

        public static class Patients
        {
            public const string View = "Patients.View";
            public const string Add = "Patients.Add";
            public const string Edit = "Patients.Edit";
            public const string Delete = "Patients.Delete";
            public const string ViewHistory = "Patients.ViewHistory";
        }

        public static class Staff
        {
            public const string View = "Staff.View";
            public const string Add = "Staff.Add";
            public const string Edit = "Staff.Edit";
            public const string Delete = "Staff.Delete";
            public const string AssignRoles = "Staff.AssignRoles";
        }

        public static class Pharmacy
        {
            public const string View = "Pharmacy.View";
            public const string AddStock = "Pharmacy.AddStock";
            public const string EditStock = "Pharmacy.EditStock";
            public const string DeleteStock = "Pharmacy.DeleteStock";
            public const string GenerateBills = "Pharmacy.GenerateBills";
        }
        
        public static class Doctors
        {
            public const string View = "Doctors.View";
            public const string Add = "Doctors.Add";
            public const string Edit = "Doctors.Edit";
            public const string Delete = "Doctors.Delete";
        }

        public static class Branches
        {
            public const string View = "Branches.View";
            public const string Add = "Branches.Add";
            public const string Edit = "Branches.Edit";
            public const string Delete = "Branches.Delete";
        }

        public static class Organizations
        {
            public const string View = "Organizations.View";
            public const string Edit = "Organizations.Edit";
        }

        public static class Settings
        {
            public const string View = "Settings.View";
            public const string ManageRoles = "Settings.ManageRoles";
            public const string ManageWhatsapp = "Settings.ManageWhatsapp";
        }

        public static IEnumerable<string> GetAll()
        {
            var permissions = new List<string>();
            var nestedClasses = typeof(SystemPermissions).GetNestedTypes();

            foreach (var nestedClass in nestedClasses)
            {
                if (nestedClass.Name == nameof(Modules)) continue;

                var fields = nestedClass.GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
                foreach (var field in fields)
                {
                    if (field.IsLiteral && !field.IsInitOnly && field.FieldType == typeof(string))
                    {
                        var value = field.GetRawConstantValue() as string;
                        if (!string.IsNullOrEmpty(value))
                        {
                            permissions.Add(value);
                        }
                    }
                }
            }

            return permissions;
        }
    }
}

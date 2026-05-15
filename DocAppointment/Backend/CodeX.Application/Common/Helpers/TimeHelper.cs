using System;

namespace CodeX.Application.Common.Helpers
{
    public static class TimeHelper
    {
        public static DateTime GetBranchLocalToday(string? timezoneId)
        {
            if (string.IsNullOrWhiteSpace(timezoneId))
            {
                return DateTime.UtcNow.Date;
            }

            try
            {
                var tzInfo = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
                return DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo).Date, DateTimeKind.Utc);
            }
            catch (TimeZoneNotFoundException)
            {
                return DateTime.UtcNow.Date;
            }
            catch (InvalidTimeZoneException)
            {
                return DateTime.UtcNow.Date;
            }
        }
    }
}

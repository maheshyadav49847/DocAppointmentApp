using System;
using System.Collections.Generic;
using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class Patient : BaseEntity
    {
        public string Phone { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? MetaDataJson { get; set; } // For preferences, age, etc.

        // Navigation Property
        public virtual ICollection<Token> Tokens { get; set; } = new List<Token>();
    }
}

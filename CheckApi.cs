using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        try {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("x-app-key", "super_secret_saas_key_123");
            var response = await client.GetAsync("http://localhost:5048/api/countries/public");
            Console.WriteLine(response.StatusCode);
            Console.WriteLine(await response.Content.ReadAsStringAsync());
        } catch (Exception ex) {
            Console.WriteLine(ex.Message);
        }
    }
}

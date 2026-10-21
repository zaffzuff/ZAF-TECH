export function ZafA2uNotice({ locale = "en" }: { locale?: string }) {
  const tr = locale === "tr";
  return <section lang={tr ? "tr" : "en"} className="my-5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-relaxed">
    <h2 className="font-semibold">{tr ? "Testnet A2U testi için ek açıklama" : "Additional notice for the Testnet A2U test"}</h2>
    <p className="mt-2">{tr
      ? "Aşağıdaki salt-okunur açıklamaların istisnası, ayrı /a2u test sayfasıdır: isteğe bağlı alım testi kullanıcı adı ve cüzdan adresi paylaşım izni ister, Pi uygulama kimliğini sunucuda doğrular ve yalnızca işletmecinin uygulama cüzdanından önceden belirlenen en fazla beş cüzdana kişi başına 0,01 Test-Pi gönderir. Normal giriş yalnızca kullanıcı adı izni ister. Kullanıcının cüzdan anahtarı veya parolası alınmaz; gerçek Pi gönderilmez. Test-Pi parasal değer taşımaz."
      : "The separate /a2u test page is an exception to the read-only descriptions below. Its optional receive test requests username and wallet-address sharing, verifies the Pi app identity on the server, and sends 0.01 Test-Pi from the operator's app wallet to each of at most five predefined recipient wallets. Normal sign-in requests username only. No user's wallet secret or password is collected, and no real Pi is transferred. Test-Pi has no monetary value."}</p>
    <p className="mt-2">{tr
      ? "Çift gönderimi önlemek ve kesilen işlemi devam ettirmek için uygulama kimliğinden üretilen bir özet, alıcı adresi, ödeme/işlem kimlikleri ve uygulamanın imzaladığı Testnet işlem kaydı sunucudaki ayrı kayıt deposunda tutulur. Pi erişim belirteci ve ham kullanıcı kimliği bu kayda yazılmaz. Blockchain kayıtları herkese açıktır ve uygulama tarafından silinemez. Kayıtlarla ilgili talepler için zaftech.contact@gmail.com adresine yazabilirsiniz."
      : "To prevent duplicate sends and resume interrupted operations, a hash derived from the app-specific identity, recipient address, payment/transaction IDs and the app-signed Testnet transaction are retained in a separate server-side store. Neither the Pi access token nor raw user ID is written to this record. Blockchain records are public and cannot be erased by this app. Contact zaftech.contact@gmail.com about application records."}</p>
  </section>;
}

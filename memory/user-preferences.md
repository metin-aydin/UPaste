---
name: user-preferences
description: Kullanıcının çalışma tercihleri ve proje ortamı
metadata:
  type: user
---

- Dil: Türkçe konuşur, yanıtlar Türkçe.
- Git worktree kullanılmaz; değişiklikler doğrudan ana çalışma kopyasında yapılır (global kural).
- Kod yorumları değişim geçmişi anlatmaz, yalnızca kodun ne yaptığını anlatır (global kural).
- Yanıt biçimi: ADHD modu — ilk satır yapılacak iş, numaralı adımlar, en fazla 5 maddelik listeler, somut süre
  tahmini, sonda tek bir sonraki adım.
- Geliştirme makinesi: Ubuntu, GNOME **Wayland**, farklı yüksekliklerde dizilmiş çok monitör. Başta başka pano
  araçları kuruluydu (biri Super+V'ye bağlıydı); 5. turda kaldırıldı.
- Hedef platform: Linux (GNOME), Windows ve macOS. 1. turdaki "yalnız Ubuntu" kararı 4. turda değişti.
- PR açıklamalarına/sürüm notlarına "Generated with Claude Code", commit mesajlarına "Co-Authored-By: Claude"
  yazılmaz (JumpDesk'teki tercih; CLAUDE.md'de kural).
- `main`'e doğrudan push yok; geliştirme kalıcı `development` dalında, `main`'e PR (JumpDesk akışı). Depolar korumalı
  olsun (2026-10-27 isteği): dal koruması, gizli değerler yalnız korunan dallarda, JumpDesk'te de aynısı.
- Proje public (MIT): kurum, sunucu ve kişi bilgisi kod, test ve dokümanlara yazılmaz.
- Arayüz metinleri: düğme/menü/ipucu Türkçede her kelimenin baş harfi büyük.
- Super+V'yi UPaste devralır; eski bağlama (Diodon) kaydedilir, UPaste'te kapatılınca geri yüklenir (2026-10-26).
- Wayland'da konum ve yapıştırma için UPaste'le gelen GNOME Shell eklentisi kullanılır; bir kez oturum
  kapat-aç kabul edildi (2026-10-26).
- **Uygulama simgesi (2026-10-26, 3. tur):** JumpDesk simgesiyle aynı tasarım (yuvarlak karo, üstte parlama, altta
  beyaz bant, kabartma gölgesi), işaret internetten alınan **Lucide "copy"** simgesi (ISC lisansı, beyaz kalın çizgi;
  kendi çizdiğim pano+ok işaretini kullanıcı beğenmedi), karo rengi DataGrip yeşili `#00D980` (degrade #12DC88 →
  #00D980 → #00CC78). Kaynak `build/icon.svg`; tepsi simgesi Lucide copy'nin beyaz çizgisi.
- **Platform (4. tur, 2026-10-26):** kullanıcı "uygulama macOS ve Windows'ta da çalışmalı" dedi (1. turdaki "yalnız
  Ubuntu" kararının yerine). Windows varsayılan kısayolu kararı kullanıcıya soruldu.
- Geçmiş penceresi Windows gibi davranmalı: açılınca hedefteki imleç yanıp sönmeye devam eder, pencere girdiyi
  takip eder; imleç yoksa macOS Paste uygulamasındaki gibi alttan kartlı panel; renkler simge yeşili. (4. tur)
- **Windows kısayolu (2026-10-26):** Win+V kalsın — UPaste, Windows'un pano geçmişi kısayolunu devralır.
- **Metinler platformdan bağımsız (2026-10-26):** arayüz ve paket metinlerinde "Ubuntu için" gibi tek işletim sistemine
  bağlayan ifade olmaz; kullanıcı uygulamanın tüm işletim sistemlerinde geçerli olmasını bekliyor.

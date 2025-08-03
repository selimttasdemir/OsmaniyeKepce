document.addEventListener('DOMContentLoaded', () => {

    // ----------- Fiyat Teklifi Formu -----------
    const offerForm = document.getElementById('offerForm');
    const offerAlert = document.getElementById('offerAlert');
  
    if (offerForm) {
      offerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        // Bootstrap validasyon
        if (!offerForm.checkValidity()) {
          offerForm.classList.add('was-validated');
          return;
        }
  
        const formData = new FormData(offerForm);
        const data = {
          name: formData.get('name').trim(),
          email: formData.get('email').trim(),
          phone: formData.get('phone').trim(),
          service: formData.get('service'),
          message: formData.get('message').trim()
        };
  
        // Telefon doğrulama (sadece rakam ve 10-15 karakter)
        if (!/^\d{10,15}$/.test(data.phone)) {
          alert('Telefon numarası sadece rakamlardan oluşmalı ve 10-15 haneli olmalıdır.');
          return;
        }
  
        try {
          const res = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              phone: data.phone,
              service: data.service,
              message: data.message
            })
          });
  
          const json = await res.json();
  
          if (json.success) {
            offerAlert.classList.remove('d-none');
            offerForm.reset();
            offerForm.classList.remove('was-validated');
  
            setTimeout(() => {
              offerAlert.classList.add('d-none');
            }, 4000);
          } else {
            alert('Mesaj gönderilemedi: ' + (json.error || 'Bilinmeyen bir hata oluştu.'));
          }
  
        } catch (err) {
          alert('Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
        }
      });
    }
  
    // ----------- İletişim Formu -----------
    const contactForm = document.getElementById('contactForm');
    const contactStatus = document.getElementById('contactStatus');
  
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        const name = contactForm.querySelector('[name="name"]').value.trim();
        const email = contactForm.querySelector('[name="email"]').value.trim();
        const phone = contactForm.querySelector('[name="phone"]').value.trim();
        const message = contactForm.querySelector('textarea[name="message"]').value.trim();
  
        if (!name || !phone || !message) {
          contactStatus.textContent = 'Lütfen ad, telefon ve mesaj alanlarını doldurun.';
          contactStatus.className = 'text-danger mt-2';
          return;
        }
  
        if (!/^\d{10,15}$/.test(phone)) {
          contactStatus.textContent = 'Telefon numarası geçersiz (yalnızca rakam ve 10-15 hane).';
          contactStatus.className = 'text-danger mt-2';
          return;
        }
  
        try {
          const res = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, message, service: "İletişim Formu" })
          });
  
          const json = await res.json();
  
          if (json.success) {
            contactStatus.textContent = 'Mesajınız başarıyla iletildi. Teşekkür ederiz!';
            contactStatus.className = 'text-success mt-2';
            contactForm.reset();
          } else {
            contactStatus.textContent = 'Gönderim hatası: ' + (json.error || 'Bilinmeyen hata');
            contactStatus.className = 'text-danger mt-2';
          }
  
        } catch (err) {
          contactStatus.textContent = 'Sunucu bağlantı hatası.';
          contactStatus.className = 'text-danger mt-2';
        }
      });
    }
  
  });
  
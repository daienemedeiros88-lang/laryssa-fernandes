document.addEventListener('DOMContentLoaded', () => {

  const navbar = document.querySelector('.lf-navbar');
  if (navbar) {
    const handleScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.lf-navbar .nav-link').forEach(link => {
    if (link.getAttribute('href') === page) link.classList.add('active');
  });

  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  document.querySelectorAll('.copyright-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  const backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      backToTopBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll('[data-required]').forEach(input => {
        const val = input.value.trim();
        const err = input.parentElement.querySelector('.form-error-text');
        if (!val || (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))) {
          input.classList.add('is-invalid');
          if (err) err.style.display = 'block';
          valid = false;
        } else {
          input.classList.remove('is-invalid');
          if (err) err.style.display = 'none';
        }
      });
      if (!valid) return;

      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Sending...';

      try {
        const formData = new FormData(form);
        formData.append('access_key', '4d7edc52-f514-4520-9a1a-260798a81d10');
        formData.append('subject', 'New Enquiry — Laryssa Fernandes PT Website');
        formData.append('from_name', 'Laryssa Fernandes Website');

        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          form.reset();

          // Show success modal
          const backdrop = document.getElementById('successModalBackdrop');
          if (backdrop) {
            backdrop.classList.add('active');
            backdrop.setAttribute('aria-hidden', 'false');
          }
        } else {
          btn.innerHTML = '<i class="fa fa-exclamation-circle me-2"></i>Something went wrong — please try again';
        }
      } catch {
        btn.innerHTML = '<i class="fa fa-exclamation-circle me-2"></i>Connection error — please try again';
      }

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-paper-plane me-2"></i>Send Message';
      }, 3000);
    });

    form.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('is-invalid'));
    });
  }

  document.querySelectorAll('.programme-card:not(.featured)').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  const counters = document.querySelectorAll('.stat-number[data-target]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      let current = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.round(current) + suffix;
      }, 25);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => countObserver.observe(el));

});
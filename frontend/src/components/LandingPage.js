import React from 'react';
import './landing.css';
import { useNavigate } from "react-router-dom"; // Import useNavigate


// Helper function to create elements without JSX
function createElement(type, props = {}, ...children) {
  return React.createElement(type, props, ...children);
}

// Hero Section Component
const Hero = () => {
  const navigate = useNavigate(); // Initialize the navigation function

  // Handle button click
  const handleClick = () => {
    navigate("/chat"); // Navigate to the '/chat' route
  };

  return createElement(
    "section",
    { className: "hero" },
    createElement(
      "div",
      { className: "hero-content" },
      createElement(
        "h1",
        { className: "hero-title" },
        createElement("span", { className: "brand-highlight" }, "CiteRight"),
        createElement("span", { className: "subtitle-text" }, "Your AI Research Assistant")
      ),
      createElement(
        "p",
        { className: "hero-subtitle" },
        "Upload your research papers and let AI extract insights instantly. Get summaries, citations, and answers without the hassle."
      ),
      createElement(
        "button",
        { className: "cta-button", onClick: handleClick }, // Add onClick handler
        "Get Started"
      ),
      createElement("div", { className: "hero-glow" })
    ),
    createElement("div", { className: "hero-particles" })
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return createElement('div', { className: 'feature-card' },
    createElement('div', { className: 'feature-icon' }, icon),
    createElement('h3', { className: 'feature-title' }, title),
    createElement('p', { className: 'feature-description' }, description)
  );
};

// Features Section Component
const Features = () => {
  return createElement('section', { className: 'features' },
    createElement('div', { className: 'container' },
      createElement('h2', { className: 'section-title' }, 'Powerful Features'),
      createElement('div', { className: 'features-grid' },
        createElement(FeatureCard, {
          icon: '📄',
          title: 'Upload Papers',
          description: 'Upload PDFs effortlessly & let AI analyze them for you.'
        }),
        createElement(FeatureCard, {
          icon: '🧠',
          title: 'AI-Powered Insights',
          description: 'Get precise answers and summaries instantly.'
        }),
        createElement(FeatureCard, {
          icon: '🔒',
          title: 'Fast & Secure',
          description: 'Your data is private & processed in real-time.'
        })
      )
    )
  );
};

// Timeline Step Component
const TimelineStep = ({ number, title, description, position, icon }) => {
  return createElement(
    'div',
    { className: `timeline-step ${position}` },
    createElement(
      'div',
      { className: 'timeline-step-content' },
      createElement('div', { className: 'step-number' }, number),
      createElement('div', { className: 'step-icon' }, icon),
      createElement('h3', { className: 'step-title' }, title),
      createElement('p', { className: 'step-description' }, description)
    )
  );
};

// How It Works Section Component with Timeline
const HowItWorks = () => {
  return createElement(
    'section',
    { className: 'how-it-works-section' },
    createElement(
      'div',
      { className: 'container' },
      createElement('h2', { className: 'section-title' }, 'How It Works'),
      createElement(
        'div',
        { className: 'timeline-container' },
        createElement('div', { className: 'timeline-line' }),
        createElement(
          TimelineStep,
          {
            number: '1',
            title: 'Upload Your Research Paper',
            description: 'Easily upload your PDF—whether it\'s a research paper, academic article, or technical report. CiteRight reads the document for you and prepares it for AI-powered analysis.',
            position: 'left',
            icon: '📄'
          }
        ),
        createElement(
          TimelineStep,
          {
            number: '2',
            title: 'Ask Any Question',
            description: 'Wondering about key takeaways, important conclusions, or specific details? Just type your question, and CiteRight will find the answers within your paper.',
            position: 'right',
            icon: '❓'
          }
        ),
        createElement(
          TimelineStep,
          {
            number: '3',
            title: 'Get Instant Insights',
            description: 'Within seconds, our AI analyzes the content and gives you clear, concise answers. No need to scan through hundreds of pages—CiteRight does the work for you.',
            position: 'left',
            icon: '💡'
          }
        ),
        createElement(
          TimelineStep,
          {
            number: '4',
            title: 'Dig Deeper',
            description: 'Want to explore more? Ask follow-up questions, and CiteRight will refine its answers based on the document.',
            position: 'right',
            icon: '🔍'
          }
        )
      )
    )
  );
};

// Call to Action Section Component
const CallToAction = () => {
  return createElement('section', { className: 'cta-section' },
    createElement('div', { className: 'container' },
      createElement('h2', { className: 'cta-title' }, 'Start Exploring Research with AI'),
      createElement('button', { className: 'cta-button glow' }, 'Chat Now!'),
      createElement('div', { className: 'cta-background' })
    )
  );
};

// Footer Component
const Footer = () => {
  return createElement('footer', { className: 'footer' },
    createElement('div', { className: 'container' },
      createElement('p', { className: 'copyright' }, '© 2025 CiteRight | Built for researchers, powered by AI.'),
      createElement('div', { className: 'social-icons' },
        createElement('a', { href: 'https://www.linkedin.com/in/soumya-bokare/', className: 'social-icon', target: '_blank', rel: 'noopener noreferrer' }, 'LinkedIn'),
        createElement('a', { href: 'https://github.com/SoumyaBokare', className: 'social-icon', target: '_blank', rel: 'noopener noreferrer' }, 'GitHub'),
      )
    )
  );
};

// Main App Component
const LandingPage = () => {
  // Initialize animations on component mount
  React.useEffect(() => {
    // Create particles for hero section
    const createParticles = () => {
      const heroSection = document.querySelector('.hero-particles');
      if (!heroSection) return;
      
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random size
        const size = Math.random() * 5 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random animation duration
        particle.style.animationDuration = `${Math.random() * 10 + 5}s`;
        
        // Random delay
        particle.style.animationDelay = `${Math.random() * 5}s`;
        
        heroSection.appendChild(particle);
      }
    };
    
    createParticles();

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, { threshold: 0.1 });

    // Observe all animatable elements
    document.querySelectorAll('.feature-card, .timeline-step, .cta-section, .hero-content')
      .forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return createElement('div', { className: 'landing-page' },
    createElement(Hero),
    createElement(Features),
    createElement(HowItWorks),
    createElement(CallToAction),
    createElement(Footer)
  );
};

export default LandingPage;

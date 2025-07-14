import React from "react";
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import '../assets/styles/Main.scss';

function Main() {

  return (
    <div className="container">
      <div className="about-section">
        <div className="image-wrapper">
          <img src="https://pbs.twimg.com/profile_images/1936554049895059456/ai9_uQtD_400x400.jpg" alt="Avatar" />
        </div>
        <div className="content">
          <div className="social_icons">
            <a href="https://github.com/ckomiya" target="_blank" rel="noreferrer"><GitHubIcon/></a>
            <a href="https://www.linkedin.com/in/ckomiya/" target="_blank" rel="noreferrer"><LinkedInIcon/></a>
          </div>
          <h1>Christian Gonzales</h1>
          <p>Lean Agile Consultant | Dev Full-Stack | AI/ML Engineer | AWS Solutions Architect </p>

          <div className="mobile_social_icons">
            <a href="ttps://github.com/ckomiya" target="_blank" rel="noreferrer"><GitHubIcon/></a>
            <a href="https://www.linkedin.com/in/ckomiya/" target="_blank" rel="noreferrer"><LinkedInIcon/></a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
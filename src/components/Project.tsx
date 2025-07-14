import React from "react";
import mock09 from '../assets/images/mock09.png';
import mock10 from '../assets/images/mock10.png';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Proyectos Personales</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://www.filmate.club/" target="_blank" rel="noreferrer"><img src={mock10} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://www.filmate.club/" target="_blank" rel="noreferrer"><h2>LLM Chatbot</h2></a>
                <p>Chatbot que utiliza un PDF RAG desarrollado con OpenAI GPT-3.5 Turbo, Langchain, Streamlit, Python</p>
            </div>
            <div className="project">
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><img src={mock09} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><h2>SAT Data Insights</h2></a>
                <p>Herramienta interactiva de análisis que aprovecha los datos abiertos del Servicio de Administración Tributaria para generar visualizaciones claras, detectar patrones relevantes y ofrecer información útil para la toma de decisiones, la transparencia fiscal y la investigación en políticas públicas.</p>
            </div>
        </div>
    </div>
    );
}

export default Project;
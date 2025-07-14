import React from "react";
import project1 from '../assets/images/llmchatbot_lp2.jpg';
import mock10 from '../assets/images/mock10.png';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Proyectos Personales</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://huggingface.co/spaces/ckomiya/chat_info_curso" target="_blank" rel="noreferrer"><img src={project1} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://huggingface.co/spaces/ckomiya/chat_info_curso" target="_blank" rel="noreferrer"><h2>LLM Chatbot</h2></a>
                <p>Chatbot que responde preguntas sobre el curso de Lenguaje de Programación II, dictado en Cibertec, utilizando un enfoque RAG (Retrieval-Augmented Generation) con PDF como fuente. Desarrollado con OpenAI GPT-3.5 Turbo, LangChain, Streamlit y Python.</p>
            </div>
            <div className="project">
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><img src={mock10} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><h2>SAT Data Insights</h2></a>
                <p>Herramienta interactiva de análisis que aprovecha los datos abiertos del Servicio de Administración Tributaria para generar visualizaciones claras, detectar patrones relevantes y ofrecer información útil para la toma de decisiones, la transparencia fiscal y la investigación en políticas públicas.</p>
            </div>
        </div>
    </div>
    );
}

export default Project;
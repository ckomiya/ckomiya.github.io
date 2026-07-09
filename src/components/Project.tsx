import React from "react";
import project1 from '../assets/images/vigia_enos.jpg';
import project2 from '../assets/images/denuncias_pnp.jpg';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Proyectos Personales</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://vigia-enos.onrender.com/" target="_blank" rel="noreferrer"><img src={project1} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://vigia-enos.onrender.com/" target="_blank" rel="noreferrer"><h2>Vigía ENOS</h2></a>
                <p>Dashboard en Dash que monitorea el Fenómeno El Niño en la costa peruana, mostrando la evolución del ICEN (Índice Costero El Niño) y el RONI (Índice Oceánico El Niño Relativo), junto con KPIs del estado actual de las condiciones océano-atmosféricas (Neutro / El Niño / La Niña).</p>
            </div>
            <div className="project">
                <a href="https://denuncias-pnp.streamlit.app/" target="_blank" rel="noreferrer"><img src={project2} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://denuncias-pnp.streamlit.app/" target="_blank" rel="noreferrer"><h2>Observatorio de Denuncias Policiales del Perú</h2></a>
                <p>Dashboard interactivo construido con Streamlit para explorar las denuncias policiales registradas en Perú, con un mapa por distrito y la evolución mensual por departamento. Utiliza el DataSet de Denuncias Policiales (SIDPOL) publicado por la PNP en la Plataforma Nacional de Datos Abiertos, el cual debe descargarse y cargarse manualmente desde la app.</p>
            </div>
        </div>
    </div>
    );
}

export default Project;
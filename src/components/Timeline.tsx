import React from "react";
import '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import '../assets/styles/Timeline.scss'

function Timeline() {
  return (
    <div id="history">
      <div className="items-container">
        <h1>Historial</h1>
        <VerticalTimeline>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            contentStyle={{ background: 'white', color: 'rgb(39, 40, 34)' }}
            contentArrowStyle={{ borderRight: '7px solid  white' }}
            date="2013 - present"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Docente</h3>
            <h4 className="vertical-timeline-element-subtitle">CIBERTEC</h4>
            <p>
              Java, Spring Framework, Scrum, MySQL, LEGO SERIOUS PLAY, Python, LLMs
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2019 - 2024"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Lean Agile Consultant</h3>
            <h4 className="vertical-timeline-element-subtitle">Inception Play</h4>
            <p>
              Scrum, SAFe, OKRs, Kanban, LEGO SERIOUS PLAY, Team Building, Agile Coaching, DevOps
            </p>
          </VerticalTimelineElement>

          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2021 - 2023"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Agile Coach</h3>
            <h4 className="vertical-timeline-element-subtitle">BanBif</h4>
            <p>
              BDD, Lean Inception, Agile Coaching, Test Cases
            </p>
          </VerticalTimelineElement>


          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2018 - 2019"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Pre Sales Consultant</h3>
            <h4 className="vertical-timeline-element-subtitle">Avantica</h4>
            <p>
              Agile, PMI, Web Development, Mobile Development, DevOps
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2014 - 2018"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Technical Leader | Project Manager</h3>
            <h4 className="vertical-timeline-element-subtitle">CGI</h4>
            <p>
              PMI, Scrum, SAFe, Kanban, DevOps, Java, Spring Framework, LEGO SERIOUS PLAY, Team Building, Agile Coaching
            </p>
          </VerticalTimelineElement>

          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2013"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Scrum Master</h3>
            <h4 className="vertical-timeline-element-subtitle">MDP</h4>
            <p>
              Web Services, Java, Spring Framework, Scrum, Kanban
            </p>
          </VerticalTimelineElement>

           <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2011 - 2012"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Senior Software Engineer</h3>
            <h4 className="vertical-timeline-element-subtitle">Stefanini</h4>
            <p>
              Web Development, Java, Spring Framework
            </p>
          </VerticalTimelineElement>

          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2011"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Solutions Architect</h3>
            <h4 className="vertical-timeline-element-subtitle">Informet</h4>
            <p>
              Web Development, Java, Spring Framework, JSF
            </p>
          </VerticalTimelineElement>


          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2010 - 2011"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Developer</h3>
            <h4 className="vertical-timeline-element-subtitle">Sigcomt</h4>
            <p>
              Web Development, Java, Spring Framework, Spring MVC
            </p>
          </VerticalTimelineElement>


          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2008 - 2010"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Developer</h3>
            <h4 className="vertical-timeline-element-subtitle">JOEDAYZ</h4>
            <p>
              Web Development, Java, Spring Framework
            </p>
          </VerticalTimelineElement>


          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2006 - 2008"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Programmer</h3>
            <h4 className="vertical-timeline-element-subtitle">Agile Works</h4>
            <p>
              Java, Spring Framework, Swing
            </p>
          </VerticalTimelineElement>


          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2006 - 2008"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBriefcase} />}
          >
            <h3 className="vertical-timeline-element-title">Programmer | Help Desk</h3>
            <h4 className="vertical-timeline-element-subtitle">Eagle Global Logistic</h4>
            <p>
              .NET
            </p>
          </VerticalTimelineElement>





        </VerticalTimeline>

        
      </div>
    </div>
  );
}

export default Timeline;
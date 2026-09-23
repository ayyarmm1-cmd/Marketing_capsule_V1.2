import React from 'react';
import { Link } from 'react-router-dom';
import { Project, User } from '../../types';
import { STATUS_COLORS } from '../../constants';
import Button from '../ui/Button';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;

interface ProjectCardProps {
    project: Project;
    clientName?: string;
    team: User[];
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, clientName, team, onEdit, onDelete }) => {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const progress = project.progress ?? 0;

  return (
    <div className="bg-container-bg dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group relative border border-slate-200 dark:border-slate-700">
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="secondary" size="sm" className="!p-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}><EditIcon /></Button>
        <Button variant="danger" size="sm" className="!p-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}><DeleteIcon /></Button>
      </div>
      <Link to={`/projects/${project.id}`} className="block">
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-text-primary leading-tight">{project.name}</h3>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[project.status] || 'bg-gray-200 text-gray-800'}`}>
              {project.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">Client: {clientName}</p>
          
          <div className="mb-4">
              <div className="flex justify-between items-center text-xs text-text-secondary dark:text-slate-400 mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-primary-action h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
          
          {project.saleRecordId && (
              <p className="text-xs text-indigo-600 font-medium mb-4">
                  Source Sale: {project.saleRecordId}
              </p>
          )}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-3 rounded-b-xl flex justify-between items-center">
          <div className="flex -space-x-2">
            {team.slice(0, 4).map(member => (
              <div key={member.id} title={member.name} className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold border-2 border-white">
                {getInitials(member.name)}
              </div>
            ))}
            {team.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white">
                +{team.length - 4}
              </div>
            )}
          </div>
          <div className="text-xs text-text-secondary dark:text-slate-400">
              Due: {project.endDate ? new Date(project.endDate).toLocaleDateString('en-CA') : 'N/A'}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProjectCard;

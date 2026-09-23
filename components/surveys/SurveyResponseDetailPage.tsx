import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SurveySubmission, Quiz, Question, CompanyProfileSetting, QuestionType, FileAnswer, SingleChoiceWithTextAnswer, Permission } from '../../types';
import { 
    apiGetSurveySubmissionById, 
    apiGetQuizById, 
    apiGetQuestionsForQuiz,
    apiGetCompanyProfile,
    apiDeleteSurveySubmission
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import SurveyResponsePDF from './SurveyResponsePDF';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../hooks/useAuth';

// Icons for ratings
interface StarIconProps {
    filled: boolean;
    className?: string;
}

const StarIcon: React.FC<StarIconProps> = ({ filled, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 inline-block ${filled ? 'text-yellow-400' : 'text-slate-300'} ${className}`}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
);

const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0 text-slate-500 dark:text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3.375 3.375 0 0 1 18.375 7.5c.988 0 1.944.417 2.617 1.143 1.22 1.33.684 3.582-.64 4.908l-9.19 9.19a2.25 2.25 0 0 1-3.182-3.182l8.432-8.432 1.06-1.06Z" /></svg>;


const SurveyResponseDetailPage: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<SurveySubmission | null>(null);
    const [survey, setSurvey] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!submissionId) {
                setError("No Submission ID provided.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const sub = await apiGetSurveySubmissionById(submissionId);
                if (!sub) throw new Error("Survey submission not found.");
                
                const [sv, qs, profile] = await Promise.all([
                    apiGetQuizById(sub.surveyId),
                    apiGetQuestionsForQuiz(sub.surveyId),
                    apiGetCompanyProfile()
                ]);

                if (!sv) throw new Error("Associated survey not found.");

                setSubmission(sub);
                setSurvey(sv);
                setQuestions(qs);
                setCompanyProfile(profile);

            } catch (err) {
                setError((err as Error).message);
                addNotification((err as Error).message, "error");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [submissionId, addNotification]);

    const handleDownloadPdf = async () => {
        if (!pdfRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(pdfRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            const imgHeight = pdfWidth / ratio;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }

            pdf.save(`SurveyResponse_${submission?.id}.pdf`);

        } catch (err) {
            addNotification("Failed to generate PDF.", "error");
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };
    
    const canDelete = hasPermission(Permission.MANAGE_SURVEYS);

    const handleDelete = async () => {
        if (!submission) return;
        const confirmed = await showConfirmation({
          title: 'Delete Survey Submission',
          message: "Are you sure you want to delete this survey submission? This action cannot be undone.",
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteSurveySubmission(submission.id);
                addNotification("Survey submission deleted successfully.", "success");
                // Navigate back to the survey's main page after deletion.
                navigate(`/surveys/${submission.surveyId}`);
            } catch (err) {
                addNotification(`Failed to delete submission: ${(err as Error).message}`, "error");
            }
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
    if (error) return <div className="text-center p-8 text-red-600 bg-white shadow-md rounded-lg">Error: {error}</div>;
    if (!submission || !survey) return null;

    const findAnswer = (questionId: string) => {
        return submission.answers.find(a => a.questionId === questionId)?.answer;
    };
    
    const renderAnswer = (question: Question, answer: any) => {
        if (answer === null || answer === undefined) {
            return <i className="text-slate-400">No answer provided.</i>;
        }

        switch(question.type) {
            case QuestionType.RATING_SCALE:
                return <div className="flex">{[...Array(question.maxRating || 5)].map((_, i) => <StarIcon key={i} filled={i < Number(answer)} />)}</div>;
            
            case QuestionType.FILE_UPLOAD:
                if (Array.isArray(answer) && answer.length > 0) {
                    return (
                        <div className="space-y-2">
                            {(answer as FileAnswer[]).map((file, i) => (
                                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                    <FileIcon />
                                    <div className="ml-3">
                                        <p className="font-medium text-sm text-primary-action dark:text-blue-400">{file.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB - {file.type}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    );
                }
                return <i className="text-slate-400">No files were uploaded.</i>;

            case QuestionType.SINGLE_CHOICE_WITH_TEXT:
                if (typeof answer === 'object' && answer !== null && 'choice' in answer) {
                    const typedAnswer = answer as SingleChoiceWithTextAnswer;
                    return (
                        <div>
                            <p className="font-semibold text-primary-action dark:text-blue-400">{typedAnswer.choice}</p>
                            {typedAnswer.text && <p className="pl-4 mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-600 ml-2">{typedAnswer.text}</p>}
                        </div>
                    );
                }
                return <i className="text-slate-400">Invalid answer format.</i>;
            
            case QuestionType.SEMANTIC_DIFFERENTIAL:
                if (typeof answer === 'object' && answer !== null) {
                    return (
                        <div className="space-y-2">
                            {(question.semanticDifferentialRows || []).map(row => (
                                <div key={row.rowId} className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                    <span className="text-sm text-text-secondary dark:text-slate-400">{row.leftLabel} / {row.rightLabel}</span>
                                    <span className="font-semibold text-primary-action dark:text-blue-400">{answer[row.rowId] || 'Not answered'}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
                return <i className="text-slate-400">No answer provided.</i>;

            case QuestionType.SINGLE_CHOICE:
                if (typeof answer === 'object' && answer !== null && 'choice' in answer && (answer as any).choice === 'Other') {
                    return <p className="text-slate-700 dark:text-slate-300">Other: <em className="text-slate-500 dark:text-slate-400">{(answer as any).text || '(not specified)'}</em></p>;
                }
                return <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{String(answer)}</p>;

            case QuestionType.MULTIPLE_CHOICE:
                if (Array.isArray(answer)) {
                    if (answer.length === 0) return <i className="text-slate-400">No answer provided.</i>;
                    return (
                        <ul className="list-disc pl-5 space-y-1">
                            {answer.map((item, i) => {
                                if (typeof item === 'object' && item !== null && item.choice === 'Other') {
                                    return <li key={i} className="text-slate-700 dark:text-slate-300">Other: <em className="text-slate-500 dark:text-slate-400">{item.text || '(not specified)'}</em></li>;
                                }
                                return <li key={i} className="text-slate-700 dark:text-slate-300">{String(item)}</li>;
                            })}
                        </ul>
                    );
                }
                 return <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{String(answer)}</p>;

            default:
                if (Array.isArray(answer)) {
                    if (answer.length === 0) return <i className="text-slate-400">No answer provided.</i>;
                    return <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{answer.join(', ')}</p>;
                }
                return <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{String(answer)}</p>;
        }
    };
    
    const backLink = submission.taskId ? `/tasks/${submission.taskId}` : `/projects/${submission.projectId}`;

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6 no-print">
                    <Link to={backLink} className="text-sm text-primary-action hover:underline">
                        &larr; Back to Task/Project
                    </Link>
                    <div className="flex items-center gap-2">
                        {canDelete && (
                            <Button onClick={handleDelete} variant="danger" size="sm">Delete Submission</Button>
                        )}
                        <Button onClick={handleDownloadPdf} isLoading={isDownloading} disabled={isDownloading}>
                            {isDownloading ? 'Generating...' : 'Download PDF'}
                        </Button>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg overflow-hidden" id="survey-content">
                    <header className="relative text-white p-8" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)' }}>
                        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop')"}}></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold">{survey.title}</h1>
                            <p className="mt-2 text-slate-300">{survey.description}</p>
                        </div>
                    </header>
                    
                    <div className="p-8 sm:p-12 space-y-10">
                    {questions.map((q, index) => {
                        const answer = findAnswer(q.id);
                        const isLightBg = index % 2 === 0;
                        return (
                            <div key={q.id} className={`py-6 px-6 rounded-lg ${isLightBg ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}>
                                <p className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4 whitespace-pre-wrap">{q.text}</p>
                                <div className="pl-4">
                                   {renderAnswer(q, answer)}
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
            </div>

            {/* Hidden component for PDF generation */}
            <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                <div ref={pdfRef}>
                    <SurveyResponsePDF 
                        submission={submission} 
                        survey={survey} 
                        questions={questions} 
                        companyProfile={companyProfile}
                    />
                </div>
            </div>
        </div>
    );
};

export default SurveyResponseDetailPage;
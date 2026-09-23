
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
    Quiz, Question, CompanyProfileSetting, QuizSection, QuestionType, SurveySubmission, 
    FileAnswer, SingleChoiceWithTextAnswer, Service 
} from '../../types';
import { 
    apiGetQuizById, apiGetQuestionsForQuiz, apiSubmitSurvey, apiGetCompanyProfile, 
    apiGetSectionsForQuiz, apiUploadFile, apiGetServices 
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import MultiSelect from '../ui/MultiSelect';

// --- Helper Components ---

interface StarIconProps { filled: boolean; }
const StarIcon: React.FC<StarIconProps> = ({ filled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 transition-colors ${filled ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-300'}`}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
);


const TakeSurveyPage: React.FC = () => {
    const { surveyId } = useParams<{ surveyId: string }>();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('projectId');
    const taskId = searchParams.get('taskId');
    
    const { addNotification } = useNotification();
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [survey, setSurvey] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [sections, setSections] = useState<QuizSection[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    
    const topOfFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!surveyId) { setError("No Survey ID provided."); setIsLoading(false); return; }
            if (!projectId) { setError("Project ID is missing from the URL. Cannot submit responses."); setIsLoading(false); return; }
            
            setIsLoading(true);
            try {
                const [fetchedSurvey, fetchedQuestions, fetchedProfile, fetchedSections, services] = await Promise.all([
                    apiGetQuizById(surveyId),
                    apiGetQuestionsForQuiz(surveyId),
                    apiGetCompanyProfile(),
                    apiGetSectionsForQuiz(surveyId),
                    apiGetServices(),
                ]);

                if (!fetchedSurvey || fetchedSurvey.quizType !== 'Survey') {
                    throw new Error("Survey not found or is not a valid survey.");
                }
                setSurvey(fetchedSurvey);
                setQuestions(fetchedQuestions);
                setCompanyProfile(fetchedProfile);
                setSections(fetchedSections);
                setAllServices(services);
            } catch (err) {
                setError((err as Error).message);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [surveyId, projectId]);

    const displaySections = useMemo(() => {
        if (!survey || questions.length === 0) return [];
        const orderedDbSections = [...sections].sort((a, b) => a.order - b.order);
        const sectionIds = new Set(sections.map(s => s.id));
        const hasUncategorized = questions.some(q => !q.sectionId || !sectionIds.has(q.sectionId));
        if (orderedDbSections.length === 0 && hasUncategorized) return [{ id: 'default', quizId: surveyId!, title: survey.title, description: survey.description || '', order: 0 }];
        if (hasUncategorized) return [...orderedDbSections, { id: 'uncategorized', quizId: surveyId!, title: 'General Questions', description: '', order: sections.length }];
        return orderedDbSections;
    }, [sections, questions, survey, surveyId]);

    const currentSection = useMemo(() => displaySections[currentSectionIndex], [displaySections, currentSectionIndex]);

    const questionsForCurrentPage = useMemo(() => {
        if (!currentSection) return [];
        const sortedQuestions = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));
        const sectionId = currentSection.id;
        if (sectionId === 'default' || sectionId === 'uncategorized') {
            const sectionIds = new Set(sections.map(s => s.id));
            return sortedQuestions.filter(q => !q.sectionId || !sectionIds.has(q.sectionId));
        }
        return sortedQuestions.filter(q => q.sectionId === sectionId);
    }, [currentSection, questions, sections]);
    
    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const validateCurrentPage = () => {
        for (const question of questionsForCurrentPage) {
            if (question.isRequired) {
                const answer = answers[question.id];
                if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '') || (Array.isArray(answer) && answer.length === 0)) {
                    addNotification(`Please answer the required question: "${question.text}"`, "warning");
                    return false;
                }
                if(question.type === QuestionType.TERMS_AND_CONDITIONS && answer !== true) {
                    addNotification(`You must accept the terms for: "${question.text}"`, "warning");
                    return false;
                }
            }
        }
        return true;
    };
    
    const handleSubmit = async () => {
        if (!projectId) { addNotification("Project ID is missing. Cannot submit.", "error"); return; }
        setIsSubmitting(true);

        try {
            const finalAnswers = { ...answers };
            const uploadPromises: Promise<any>[] = [];

            questions.forEach(q => {
                if (q.type === QuestionType.FILE_UPLOAD && answers[q.id] && Array.isArray(answers[q.id])) {
                    const files: File[] = answers[q.id];
                    files.forEach(file => {
                        const promise = apiUploadFile(file, `survey_uploads/${surveyId}/${q.id}/${file.name}`).then(url => ({ questionId: q.id, file, url }));
                        uploadPromises.push(promise);
                    });
                }
            });
            
            const uploadedFiles = await Promise.all(uploadPromises);

            uploadedFiles.forEach(uploaded => {
                const { questionId, file, url } = uploaded;
                const fileAnswer: FileAnswer = { name: file.name, url, size: file.size, type: file.type };
                if (!Array.isArray(finalAnswers[questionId])) finalAnswers[questionId] = [];
                // Replace the File object with the FileAnswer object
                const fileIndex = (finalAnswers[questionId] as (File | FileAnswer)[]).findIndex(f => f instanceof File && f.name === file.name);
                if (fileIndex > -1) {
                    finalAnswers[questionId][fileIndex] = fileAnswer;
                } else { // Should not happen if logic is correct, but as a fallback
                    finalAnswers[questionId].push(fileAnswer);
                }
            });

            const submissionPayload: SurveySubmission['answers'] = questions.map(q => ({
                questionId: q.id, questionText: q.text, answer: finalAnswers[q.id] ?? null
            }));

            await apiSubmitSurvey({ surveyId: survey!.id, projectId, taskId: taskId || undefined, answers: submissionPayload });
            setIsComplete(true);
            topOfFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            addNotification(`Submission failed: ${(err as Error).message}`, "error");
            setIsSubmitting(false);
        }
    };
    
    const handleNext = () => {
        if (validateCurrentPage()) {
            if (currentSectionIndex < displaySections.length - 1) {
                setCurrentSectionIndex(prev => prev + 1);
                topOfFormRef.current?.scrollIntoView({ behavior: 'smooth' });
            } else {
                handleSubmit();
            }
        }
    };

    const handleBack = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prev => prev - 1);
            topOfFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    const renderQuestion = (question: Question) => {
        const answer = answers[question.id];

        switch(question.type) {
            case QuestionType.OPEN_TEXT:
                return <Input as="textarea" rows={4} value={answer || ''} onChange={e => handleAnswerChange(question.id, e.target.value)} placeholder="Your answer here..." required={question.isRequired} />;
            
            case QuestionType.SINGLE_CHOICE:
            case QuestionType.MULTIPLE_CHOICE:
                const isSingleChoice = question.type === QuestionType.SINGLE_CHOICE;
                return (
                    <div className="space-y-3">
                    {(question.options || []).map((opt, optIndex) => {
                        const hasImage = !!opt.imageUrl;
                        return (
                            <label key={optIndex} className={`flex p-3 rounded-lg border-2 cursor-pointer transition-all has-[:checked]:border-primary-action has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/50 ${hasImage ? 'flex-col sm:flex-row text-center sm:text-left items-center' : 'items-center'}`}>
                                <input 
                                    type={isSingleChoice ? 'radio' : 'checkbox'} 
                                    name={`question_${question.id}`} 
                                    checked={isSingleChoice ? answer === opt.text : (answer || []).includes(opt.text)}
                                    onChange={() => {
                                        const current = answer || [];
                                        if (isSingleChoice) { handleAnswerChange(question.id, opt.text); } 
                                        else { const newAnswers = current.includes(opt.text) ? current.filter((a:string) => a !== opt.text) : [...current, opt.text]; handleAnswerChange(question.id, newAnswers); }
                                    }}
                                    className="h-5 w-5 text-primary-action focus:ring-primary-action border-gray-300"
                                />
                                <div className={`flex-grow flex items-center gap-4 ${hasImage ? 'flex-col sm:flex-row mt-2 sm:mt-0 sm:ml-4' : 'ml-4'}`}>
                                    {hasImage && <img src={opt.imageUrl} alt={opt.text} className="w-24 h-24 object-cover rounded-md flex-shrink-0"/>}
                                    <span className="text-md text-text-primary dark:text-slate-200">{opt.text}</span>
                                </div>
                            </label>
                        );
                    })}
                    </div>
                );

            case QuestionType.RATING_SCALE:
                return (
                    <div className="flex items-center space-x-1">
                        {[...Array(question.maxRating || 5)].map((_, i) => <button type="button" key={i} onClick={() => handleAnswerChange(question.id, i + 1)} className="p-1 rounded-full text-2xl"><StarIcon filled={(answer || 0) >= i + 1} /></button>)}
                    </div>
                );
            
            case QuestionType.SEMANTIC_DIFFERENTIAL:
                const semanticAnswer = answer || {};
                return (
                    <div className="space-y-4">
                        {(question.semanticDifferentialRows || []).map(row => (
                            <div key={row.rowId} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <span className="w-1/3 text-right font-semibold text-text-primary dark:text-slate-200 pr-4">{row.leftLabel}</span>
                                <div className="w-1/3 flex justify-around">
                                    {(row.options || []).map(opt => (
                                        <input 
                                            key={opt}
                                            type="radio"
                                            name={`semantic_${question.id}_${row.rowId}`}
                                            value={opt}
                                            checked={semanticAnswer[row.rowId] === opt}
                                            onChange={() => handleAnswerChange(question.id, { ...semanticAnswer, [row.rowId]: opt })}
                                            className="h-5 w-5 text-primary-action focus:ring-primary-action border-gray-300 dark:bg-slate-600 dark:border-slate-500"
                                            aria-label={`${row.leftLabel} to ${row.rightLabel}, option ${opt}`}
                                        />
                                    ))}
                                </div>
                                <span className="w-1/3 text-left font-semibold text-text-primary dark:text-slate-200 pl-4">{row.rightLabel}</span>
                            </div>
                        ))}
                    </div>
                );
                
            case QuestionType.TERMS_AND_CONDITIONS:
                return (
                    <label className="flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all has-[:checked]:border-primary-action has-[:checked]:bg-blue-50">
                        <input type="checkbox" checked={!!answer} onChange={e => handleAnswerChange(question.id, e.target.checked)} className="h-5 w-5 text-primary-action focus:ring-primary-action border-gray-300 mt-1" required={question.isRequired}/>
                        <span className="ml-4 text-md text-text-primary">{question.termsAcceptText || 'I Accept'}</span>
                    </label>
                );

            default:
                return <p>Unsupported question type.</p>;
        }
    };


    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center p-4"><div className="p-8 bg-white shadow-lg rounded-lg"><h2 className="text-2xl font-bold text-red-600">Error</h2><p className="mt-2 text-gray-600">{error}</p></div></div>;
    
    if (isComplete) {
        return (
             <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" ref={topOfFormRef}>
                <div className="max-w-2xl w-full mx-auto bg-white p-12 rounded-lg shadow-xl text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    <h1 className="text-3xl font-bold mt-4">Thank You!</h1>
                    <p className="text-slate-600 mt-2">Your response has been submitted successfully.</p>
                </div>
            </div>
        );
    }
    
    if (!survey) return null;

    const progress = displaySections.length > 1 ? ((currentSectionIndex + 1) / displaySections.length) * 100 : 100;
    const isLastPage = currentSectionIndex === displaySections.length - 1;

    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8" ref={topOfFormRef}>
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                 <header className="text-center mb-8 pb-4 border-b">
                    {companyProfile?.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="h-16 mx-auto mb-4"/>}
                    <h1 className="text-3xl font-bold text-slate-800">{survey!.title}</h1>
                    <p className="text-slate-500 mt-2">{survey!.description}</p>
                </header>

                {displaySections.length > 1 && (
                    <div className="my-6">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-primary-action">Progress</span>
                            <span className="text-sm font-medium text-primary-action">{currentSectionIndex + 1} / {displaySections.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-primary-action h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                    </div>
                )}
                
                {currentSection.title && currentSection.id !== 'default' && (
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-700">{currentSection.title}</h2>
                        {currentSection.description && <p className="text-slate-500 mt-1">{currentSection.description}</p>}
                    </div>
                )}

                <div className="space-y-8">
                    {questionsForCurrentPage.map((q, index) => (
                        <div key={q.id} className={`py-6 px-6 rounded-lg ${index % 2 === 0 ? 'bg-slate-50' : ''}`}>
                            <p className="font-semibold text-lg text-text-primary mb-4 whitespace-pre-wrap">
                                {q.text} {q.isRequired && <span className="text-red-500">*</span>}
                            </p>
                            <div className="mt-4 space-y-3">
                               {renderQuestion(q)}
                            </div>
                        </div>
                    ))}
                </div>
                
                 <div className="mt-8 pt-6 border-t flex justify-between items-center">
                    <Button type="button" variant="secondary" onClick={handleBack} disabled={currentSectionIndex === 0}>Previous</Button>
                    <Button type="button" size="lg" onClick={handleNext} isLoading={isSubmitting}>{isLastPage ? 'Submit' : 'Next'}</Button>
                </div>
            </div>
        </div>
    );
};

export default TakeSurveyPage;

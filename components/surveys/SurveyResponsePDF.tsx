import React from 'react';
import { SurveySubmission, Quiz, Question, CompanyProfileSetting, QuestionType, FileAnswer, SingleChoiceWithTextAnswer } from '../../types';

interface SurveyResponsePDFProps {
    submission: SurveySubmission;
    survey: Quiz;
    questions: Question[];
    companyProfile: CompanyProfileSetting | null;
}

const StarIcon: React.FC<{ filled: boolean; }> = ({ filled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.2rem', height: '1.2rem', display: 'inline-block', color: filled ? '#FBBF24' : '#D1D5DB' }}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
);


const SurveyResponsePDF: React.FC<SurveyResponsePDFProps> = ({ submission, survey, questions, companyProfile }) => {
    
    const findAnswer = (questionId: string) => {
        return submission.answers.find(a => a.questionId === questionId)?.answer;
    };

    // Filter out questions that should not be included in the PDF download.
    const questionsForPDF = questions.filter(q => q.type !== QuestionType.TERMS_AND_CONDITIONS);
    
    return (
        <div style={{ width: '210mm', minHeight: '297mm', padding: '1in', fontFamily: 'Arial, sans-serif', backgroundColor: 'white', color: '#333' }}>
            <div style={{ 
                backgroundColor: '#1E3A8A', 
                color: 'white', 
                padding: '20px', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{survey.title}</h1>
                    {/* Description removed as per user request */}
                </div>
                 {companyProfile?.logoUrl && (
                    <img src={companyProfile.logoUrl} alt="Company Logo" style={{ maxHeight: '50px', maxWidth: '150px' }} />
                )}
            </div>

            <p style={{ fontSize: '12px', color: '#555', marginTop: '20px' }}>
                <strong>Submission ID:</strong> {submission.id} <br />
                <strong>Submitted On:</strong> {new Date(submission.submittedAt).toLocaleString('en-GB')}
            </p>

            <div style={{ marginTop: '30px' }}>
                {questionsForPDF.map((q, index) => {
                    const answer = findAnswer(q.id);
                    const isLightBg = index % 2 === 0;
                    return (
                        <div key={q.id} style={{ backgroundColor: isLightBg ? '#F3F4F6' : '#FFFFFF', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
                            <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '0 0 10px 0' }}>{q.text}</p>
                            <div style={{ paddingLeft: '10px' }}>
                                { (q.type === QuestionType.OPEN_TEXT || q.type === QuestionType.PRICE_CHART) && (
                                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px' }}>{(typeof answer === 'string' || typeof answer === 'number') ? String(answer) : Array.isArray(answer) ? answer.join(', ') : <i style={{color: '#6b7281'}}>No answer provided.</i>}</p>
                                )}
                                { q.type === QuestionType.RATING_SCALE && (
                                    <div>
                                        {[...Array(q.maxRating || 5)].map((_, i) => <StarIcon key={i} filled={i < Number(answer)} />)}
                                    </div>
                                )}
                                { (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) && (
                                    Array.isArray(answer) ? (
                                        <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
                                            {(answer as any[]).map((item, i) => (
                                                <li key={i} style={{ marginBottom: '5px' }}>
                                                    {typeof item === 'object' && item !== null && item.choice === 'Other' 
                                                        ? `Other: ${item.text || '(not specified)'}`
                                                        : String(item)
                                                    }
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        typeof answer === 'object' && answer !== null && 'choice' in answer && (answer as any).choice === 'Other' ? (
                                            <p style={{ margin: 0 }}>Other: <i>{(answer as any).text || '(not specified)'}</i></p>
                                        ) : (
                                            <p style={{ margin: 0 }}>{String(answer)}</p>
                                        )
                                    )
                                )}
                                { q.type === QuestionType.SINGLE_CHOICE_WITH_TEXT && typeof answer === 'object' && answer !== null && 'choice' in answer && (
                                    <div>
                                        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{(answer as SingleChoiceWithTextAnswer).choice}</p>
                                        {(answer as SingleChoiceWithTextAnswer).text && <p style={{ whiteSpace: 'pre-wrap', margin: 0, paddingLeft: '15px', borderLeft: '2px solid #ccc', fontSize: '12px', color: '#555' }}>{(answer as SingleChoiceWithTextAnswer).text}</p>}
                                    </div>
                                )}
                                { q.type === QuestionType.SEMANTIC_DIFFERENTIAL && typeof answer === 'object' && answer !== null && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <tbody>
                                        {(q.semanticDifferentialRows || []).map(row => (
                                            <tr key={row.rowId}>
                                                <td style={{ padding: '4px', border: '1px solid #eee', width: '45%' }}>{row.leftLabel} / {row.rightLabel}</td>
                                                <td style={{ padding: '4px', border: '1px solid #eee', fontWeight: 'bold', color: '#1E3A8A' }}>{answer[row.rowId] || <i style={{color: '#6b7281'}}>Not answered</i>}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                )}
                                { q.type === QuestionType.FILE_UPLOAD && Array.isArray(answer) && answer.length > 0 && (
                                    <div>
                                        {(answer as unknown as FileAnswer[]).map((file, i) => (
                                            <div key={i} style={{ marginBottom: '5px' }}>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#1E3A8A' }}>
                                                    {file.name}
                                                </a>
                                                <span style={{ fontSize: '11px', color: '#555' }}> ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                { q.type === QuestionType.FILE_UPLOAD && (!Array.isArray(answer) || answer.length === 0) && (
                                    <p style={{ margin: 0, fontSize: '13px' }}><i style={{color: '#6b7281'}}>No files were uploaded.</i></p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center', fontSize: '10px', color: '#888', borderTop: '1px solid #eee' }}>
                <p>Generated by {companyProfile?.appName || 'Marketing Capsule ERP'}</p>
            </div>
        </div>
    );
};

export default SurveyResponsePDF;

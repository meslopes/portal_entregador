import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft } from 'lucide-react';

const PendingApprovalPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '3rem 2rem',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <Clock size={40} style={{ color: '#d97706' }} />
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '0.75rem'
        }}>
          Cadastro Realizado!
        </h1>

        <p style={{
          color: '#64748b',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          marginBottom: '1.5rem'
        }}>
          Seu cadastro foi enviado com sucesso e esta sendo analisado pela equipe.
        </p>

        <div style={{
          background: '#f0fdf4',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textAlign: 'left'
        }}>
          <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
          <p style={{ color: '#166534', fontSize: '0.8125rem' }}>
            Voce recebera uma notificacao quando seu cadastro for aprovado.
          </p>
        </div>

        <p style={{
          color: '#94a3b8',
          fontSize: '0.8125rem',
          marginBottom: '2rem'
        }}>
          Apos a aprovacao, voce podera acessar o sistema normalmente usando seu email e senha.
        </p>

        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#2563eb',
            color: 'white',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={18} /> Ir para o Login
        </Link>
      </div>
    </div>
  );
};

export default PendingApprovalPage;

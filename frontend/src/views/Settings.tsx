import React from 'react';

export const Settings: React.FC<{ id: string; label: string }> = ({ id, label }) => {
  return (
    <div>
      <h1>{label}</h1>
    </div>
  );
};
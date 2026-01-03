import { useState } from 'react';
import Layout from '../components/Layout';

export default function ProfilePage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border-b border-tactical pb-4">
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wider">
            Personnel Record
          </h1>
          <p className="font-mono text-xs text-neon-blue uppercase tracking-widest mt-1">
            Unit Configuration & Status
          </p>
        </div>
        
        <form className="bg-surface border border-tactical p-8 space-y-8 relative overflow-hidden">
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-blue"></div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                Full Designation
              </label>
              <input
                type="text"
                className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none"
                placeholder="Name"
                defaultValue="Unit #734"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                BitChat ID
              </label>
              <input
                type="text"
                className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none"
                placeholder="@handle"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Skill Modules (Capabilities)
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none"
                placeholder="ENTER_MODULE_ID"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                className="bg-neon-blue/10 text-neon-blue border border-neon-blue px-6 hover:bg-neon-blue hover:text-black transition-colors font-mono text-sm uppercase"
              >
                Install
              </button>
            </div>
            
            <div className="bg-void/50 border border-tactical p-4 min-h-[100px]">
              {skills.length === 0 ? (
                <span className="text-gray-600 font-mono text-xs uppercase opacity-50">No modules installed</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span
                      key={skill}
                      className="bg-neon-blue/5 border border-neon-blue/50 text-neon-blue px-3 py-1 text-xs font-mono uppercase flex items-center gap-3 group hover:bg-neon-blue/20 transition-colors"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-neon-blue/50 hover:text-neon-red font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Operational Status
            </label>
            <select className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none appearance-none">
              <option value="available">READY (AVAILABLE)</option>
              <option value="busy">ENGAGED (BUSY)</option>
              <option value="offline">OFFLINE</option>
            </select>
          </div>

          <div className="pt-4 border-t border-tactical">
            <button
              type="submit"
              className="w-full bg-white text-black border border-white py-3 font-mono font-bold uppercase tracking-widest hover:bg-neon-blue hover:border-neon-blue transition-all duration-200"
            >
              Update Record
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

import {create} from 'zustand';
import {Project, NewProject} from '@/lib/db/schema';
import {getProjectsByCompany, createProject, deleteProject} from '@/lib/db/service';

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setIsLoading: (loading: boolean) => void;

  // Async actions
  loadProjectsByCompany: (companyId: string) => Promise<void>;
  createNewProject: (projectData: NewProject) => Promise<Project>;
  deleteProjectById: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,

  setProjects: (projects) => set({projects}),
  setSelectedProject: (project) => set({selectedProject: project}),
  addProject: (project) => set({projects: [...get().projects, project]}),
  updateProject: (id, updates) =>
    set({
      projects: get().projects.map((p) => (p.id === id ? {...p, ...updates} : p)),
    }),
  removeProject: (id) =>
    set({
      projects: get().projects.filter((p) => p.id !== id),
      selectedProject: get().selectedProject?.id === id ? null : get().selectedProject,
    }),
  setIsLoading: (loading) => set({isLoading: loading}),

  loadProjectsByCompany: async (companyId: string) => {
    set({isLoading: true});
    try {
      const projects = await getProjectsByCompany(companyId);
      set({projects});
    } catch (error) {
      console.error('Failed to load projects:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  createNewProject: async (projectData: NewProject) => {
    set({isLoading: true});
    try {
      const newProject = await createProject(projectData);
      set({projects: [newProject, ...get().projects]});
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  deleteProjectById: async (id: string) => {
    set({isLoading: true});
    try {
      await deleteProject(id);
      set({
        projects: get().projects.filter((p) => p.id !== id),
        selectedProject: get().selectedProject?.id === id ? null : get().selectedProject,
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },
}));

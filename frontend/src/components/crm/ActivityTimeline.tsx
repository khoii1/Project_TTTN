'use client';

import React, { useEffect, useState } from 'react';
import { Timeline, Button, Modal, Form, Input, message, Tabs, Tag, Select, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { notesApi } from '@/features/notes/notes.api';
import { tasksApi } from '@/features/tasks/tasks.api';
import { Note } from '@/features/notes/notes.types';
import { Task, TaskStatus, TaskPriority } from '@/features/tasks/tasks.types';

interface ActivityTimelineProps {
  relatedType: string;
  relatedId: string;
}

type TimelineItem = {
  type: 'note' | 'task';
  id: string;
  title: string;
  description?: string;
  date: string;
  status?: string;
  author?: string;
  raw: any;
};

export const ActivityTimeline = ({ relatedType, relatedId }: ActivityTimelineProps) => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      // Wait for both notes and tasks, but catch errors independently just in case backend filters fail
      let fetchedNotes: Note[] = [];
      let fetchedTasks: Task[] = [];
      
      try {
        const allNotes = await notesApi.getAll(); // Ideally backend supports filtering: { relatedType, relatedId }
        fetchedNotes = allNotes.filter(n => n.relatedType === relatedType && n.relatedId === relatedId);
      } catch (e) {
        console.error('Failed fetching notes', e);
      }

      try {
        const allTasks = await tasksApi.getAll();
        fetchedTasks = allTasks.filter(t => t.relatedType === relatedType && t.relatedId === relatedId);
      } catch (e) {
        console.error('Failed fetching tasks', e);
      }

      const formattedNotes: TimelineItem[] = fetchedNotes.map(n => ({
        type: 'note',
        id: n.id,
        title: 'Note Added',
        description: n.content,
        date: n.createdAt,
        author: n.author ? `${n.author.firstName} ${n.author.lastName}` : 'User',
        raw: n
      }));

      const formattedTasks: TimelineItem[] = fetchedTasks.map(t => ({
        type: 'task',
        id: t.id,
        title: `Task: ${t.title}`,
        description: t.description,
        date: t.createdAt,
        status: t.status,
        raw: t
      }));

      const allItems = [...formattedNotes, ...formattedTasks].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setItems(allItems);
    } catch (error) {
      message.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [relatedType, relatedId]);

  const handleAddNote = async (values: any) => {
    try {
      await notesApi.create({
        content: values.content,
        relatedType,
        relatedId,
      });
      message.success('Note added');
      setIsNoteModalOpen(false);
      form.resetFields();
      fetchActivities();
    } catch (error) {
      message.error('Failed to add note');
    }
  };

  const handleAddTask = async (values: any) => {
    try {
      await tasksApi.create({
        ...values,
        relatedType,
        relatedId,
        status: TaskStatus.NOT_STARTED,
      });
      message.success('Task created');
      setIsTaskModalOpen(false);
      form.resetFields();
      fetchActivities();
    } catch (error) {
      message.error('Failed to add task');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesApi.delete(id);
      message.success('Note deleted');
      fetchActivities();
    } catch (error) {
      message.error('Failed to delete note');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold m-0">Activity Timeline</h3>
        <div className="space-x-2">
          <Button size="small" icon={<PlusOutlined />} onClick={() => setIsNoteModalOpen(true)}>Add Note</Button>
          <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => setIsTaskModalOpen(true)}>Add Task</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 p-4">No activities recorded yet.</div>
      ) : (
        <Timeline
          items={items.map(item => ({
            color: item.type === 'note' ? 'blue' : item.status === 'COMPLETED' ? 'green' : 'orange',
            children: (
              <div className="mb-4">
                <div className="flex justify-between">
                  <div className="font-semibold flex items-center space-x-2">
                    <span>{item.title}</span>
                    {item.type === 'task' && <Tag color={item.status === 'COMPLETED' ? 'green' : 'orange'}>{item.status}</Tag>}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(item.date).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-gray-600 whitespace-pre-wrap">{item.description}</div>
                {item.type === 'note' && (
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-400">
                    <span>By {item.author}</span>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteNote(item.id)} />
                  </div>
                )}
              </div>
            )
          }))}
        />
      )}

      <Modal title="Add Note" open={isNoteModalOpen} onCancel={() => setIsNoteModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleAddNote} layout="vertical">
          <Form.Item name="content" rules={[{ required: true, message: 'Note content is required' }]}>
            <Input.TextArea rows={4} placeholder="Type your note here..." />
          </Form.Item>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit">Save Note</Button>
          </div>
        </Form>
      </Modal>

      <Modal title="Add Task" open={isTaskModalOpen} onCancel={() => setIsTaskModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleAddTask} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Task title" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue={TaskPriority.NORMAL}>
            <Select>
              {Object.values(TaskPriority).map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="dueDate" label="Due Date">
            <DatePicker className="w-full" />
          </Form.Item>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit">Save Task</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, getDocs, query, where, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { uploadAvatarWithProgress, MAX_AVATAR_BYTES } from '@/lib/firebase/storage';
import { setOnline } from '@/lib/firebase/rtdb';
import { useAppStore } from '@/store';
import { UserAvatar } from './UserAvatar';
import toast from 'react-hot-toast';

interface EditProfileSheetProps {
    onClose: () => void;
}

export function EditProfileSheet({ onClose }: EditProfileSheetProps) {
    const { currentUser, setCurrentUser } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(currentUser?.name ?? '');
    const [bio, setBio] = useState(currentUser?.bio ?? '');
    const [city, setCity] = useState(currentUser?.city ?? '');
    const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser?.avatarUrl);
    const [uploadedAvatar, setUploadedAvatar] = useState<{ url: string; path: string } | null>(
        null
    );
    const [uploadProgress, setUploadProgress] = useState<number | null>(null); // null = idle
    const [pickerOpen, setPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const openFilePicker = () => {
        setPickerOpen(true);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setPickerOpen(false);
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_AVATAR_BYTES) {
            toast.error('Image must be 2 MB or smaller.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setUploadProgress(0);
        setUploadedAvatar(null);

        try {
            const result = await uploadAvatarWithProgress(
                currentUser!.uid,
                file,
                setUploadProgress
            );
            setUploadedAvatar(result);
            // Keep the local object URL as preview — it's already loaded and avoids
            // a flash while the Storage URL image downloads
            setUploadProgress(null);
        } catch {
            toast.error('Photo upload failed. Please try again.');
            setAvatarPreview(currentUser?.avatarUrl);
            setUploadProgress(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!currentUser) return;
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 30) {
            toast.error('Name must be 2–30 characters.');
            return;
        }

        setSaving(true);
        try {
            const avatarUrl = uploadedAvatar?.url ?? currentUser.avatarUrl;
            const avatarPath = uploadedAvatar?.path ?? currentUser.avatarPath;

            const updates: Record<string, any> = {
                name: trimmedName,
                bio: bio.trim() || null,
                city: city.trim() || null,
                avatarUrl: avatarUrl ?? null,
                avatarPath: avatarPath ?? null,
            };

            await updateDoc(doc(db, 'users', currentUser.uid), updates);

            // Update participantNames in all DMs so other users see the new name immediately
            if (trimmedName !== currentUser.name) {
                const dmsSnap = await getDocs(
                    query(
                        collection(db, 'dms'),
                        where('participants', 'array-contains', currentUser.uid)
                    )
                );
                if (!dmsSnap.empty) {
                    const batch = writeBatch(db);
                    dmsSnap.forEach((dmDoc) => {
                        batch.update(dmDoc.ref, {
                            [`participantNames.${currentUser.uid}`]: trimmedName,
                        });
                    });
                    await batch.commit();
                }
            }

            setCurrentUser({
                ...currentUser,
                name: trimmedName,
                bio: bio.trim() || undefined,
                city: city.trim() || undefined,
                avatarUrl,
                avatarPath,
            });

            // Touch RTDB presence so other users' caches see a fresh lastSeen and re-fetch this profile
            setOnline(currentUser.uid).catch(() => {});
            toast.success('Profile updated.');
            onClose();
        } catch (err) {
            toast.error('Failed to save. Please try again.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full sm:max-w-sm bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up p-6 pb-safe max-h-[90dvh] overflow-y-auto">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors"
                    aria-label="Close"
                >
                    <svg
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                <h2
                    id="edit-profile-title"
                    className="text-lg font-bold text-[var(--text-primary)] mb-5"
                >
                    Edit Profile
                </h2>

                {/* Avatar upload */}
                <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="relative">
                        <UserAvatar
                            name={currentUser.name}
                            gender={currentUser.gender}
                            country={currentUser.country}
                            size="xl"
                            showFlag={false}
                            avatarUrl={avatarPreview}
                        />
                        {pickerOpen && uploadProgress === null ? (
                            <div className="absolute inset-0 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
                        ) : uploadProgress !== null ? (
                            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
                                <svg
                                    width="48"
                                    height="48"
                                    viewBox="0 0 48 48"
                                    className="-rotate-90"
                                >
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth="4"
                                    />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="4"
                                        strokeDasharray={`${2 * Math.PI * 20}`}
                                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - uploadProgress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                                    />
                                </svg>
                                <span className="absolute text-white text-xs font-semibold">
                                    {uploadProgress}%
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={openFilePicker}
                                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                                aria-label="Change profile photo"
                                disabled={saving}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="white"
                                    strokeWidth={2}
                                >
                                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={uploadProgress !== null || pickerOpen || saving}
                        className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {pickerOpen && uploadProgress === null
                            ? 'Waiting for file…'
                            : uploadProgress !== null
                              ? `Uploading… ${uploadProgress}%`
                              : avatarPreview
                                ? 'Change photo'
                                : 'Add photo'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                    />
                    <p className="text-xs text-[var(--text-muted)]">Max 2 MB</p>
                </div>

                {/* Fields */}
                <div className="flex flex-col gap-4">
                    <div>
                        <label
                            htmlFor="ep-name"
                            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                        >
                            Display name
                        </label>
                        <input
                            id="ep-name"
                            type="text"
                            maxLength={30}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="ep-bio"
                            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                        >
                            About me{' '}
                            <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                        </label>
                        <textarea
                            id="ep-bio"
                            maxLength={160}
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Write something about yourself..."
                            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent resize-none"
                        />
                        <p className="text-xs text-[var(--text-muted)] text-right mt-1">
                            {bio.length}/160
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="ep-city"
                            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                        >
                            Location{' '}
                            <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                        </label>
                        <input
                            id="ep-city"
                            type="text"
                            maxLength={60}
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. New York, London..."
                            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || uploadProgress !== null}
                    className="mt-6 w-full py-3 rounded-xl font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        'Save changes'
                    )}
                </button>
            </div>
        </div>
    );
}

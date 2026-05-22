import { useEffect, useState } from "react";
import { Mail, Phone, Clock3, PencilLine, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "./AuthProvider";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  getProfile,
  listEmergencyContacts,
  updateEmergencyContact,
  updateProfile,
  type EmergencyContact,
  type ProfileUpdateRequest,
} from "@/lib/safeher-api";

type ProfileForm = ProfileUpdateRequest;

type ContactForm = {
  id: number | null;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  is_primary: boolean;
};

const emptyContactForm: ContactForm = {
  id: null,
  name: "",
  phone: "",
  email: "",
  relationship: "other",
  is_primary: false,
};

export function AccountSection() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    email: user?.email ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
  });
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    void loadProfile();
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoadingProfile(true);
    try {
      const nextProfile = await getProfile();
      setProfileForm({
        email: nextProfile.email ?? "",
        first_name: nextProfile.first_name ?? "",
        last_name: nextProfile.last_name ?? "",
        phone: nextProfile.phone ?? "",
      });
      updateUser(nextProfile);
    } catch (error) {
      toast.error("Profile unavailable", {
        description: error instanceof Error ? error.message : "Could not load your profile.",
      });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const response = await listEmergencyContacts();
      setContacts(response.contacts);
    } catch (error) {
      toast.error("Contacts unavailable", {
        description: error instanceof Error ? error.message : "Could not load emergency contacts.",
      });
    } finally {
      setLoadingContacts(false);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const nextProfile = await updateProfile(profileForm);
      updateUser(nextProfile);
      toast.success("Profile updated", { description: "Your account details are now stored in the database." });
    } catch (error) {
      toast.error("Profile update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  function beginEditContact(contact: EmergencyContact) {
    setContactForm({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relationship: contact.relationship,
      is_primary: contact.is_primary,
    });
  }

  function resetContactForm() {
    setContactForm(emptyContactForm);
  }

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingContact(true);
    const payload = {
      name: contactForm.name.trim(),
      phone: contactForm.phone.trim(),
      email: contactForm.email.trim(),
      relationship: contactForm.relationship,
      is_primary: contactForm.is_primary,
    };

    try {
      if (contactForm.id) {
        await updateEmergencyContact(contactForm.id, payload);
        toast.success("Emergency contact updated");
      } else {
        await createEmergencyContact(payload);
        toast.success("Emergency contact saved");
      }

      resetContactForm();
      await loadContacts();
    } catch (error) {
      toast.error("Contact save failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingContact(false);
    }
  }

  async function handlePrimary(contact: EmergencyContact) {
    setSavingContact(true);
    try {
      await updateEmergencyContact(contact.id, { is_primary: true });
      await loadContacts();
      toast.success("Primary contact updated");
    } catch (error) {
      toast.error("Primary update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingContact(false);
    }
  }

  async function handleDelete(contact: EmergencyContact) {
    setSavingContact(true);
    try {
      await deleteEmergencyContact(contact.id);
      await loadContacts();
      toast.success("Emergency contact removed");
      if (contactForm.id === contact.id) {
        resetContactForm();
      }
    } catch (error) {
      toast.error("Contact removal failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingContact(false);
    }
  }

  return (
    <section id="account" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">Account</div>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-5xl">Keep your profile and emergency contacts current</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/65 md:text-base">
          The profile data, creation time, and trusted-contact records are stored in the database so SOS alerts can use them immediately.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-2xl">Profile details</CardTitle>
            <CardDescription className="text-foreground/60">
              Update the account fields that the backend keeps for your session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoPill icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || profileForm.email || "Not set"} />
              <InfoPill icon={<Phone className="h-4 w-4" />} label="Phone" value={user?.phone || profileForm.phone || "Not set"} />
              <InfoPill
                icon={<Clock3 className="h-4 w-4" />}
                label="Created"
                value={user?.created_at ? new Date(user.created_at).toLocaleString() : loadingProfile ? "Loading…" : "Not loaded"}
              />
              <InfoPill
                icon={<Star className="h-4 w-4" />}
                label="Verified"
                value={user?.is_verified ? "Yes" : "No"}
              />
            </div>

            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={profileForm.first_name ?? ""} onChange={(value) => setProfileForm((current) => ({ ...current, first_name: value }))} />
                <Field label="Last name" value={profileForm.last_name ?? ""} onChange={(value) => setProfileForm((current) => ({ ...current, last_name: value }))} />
              </div>
              <Field label="Email" type="email" value={profileForm.email ?? ""} onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))} />
              <Field label="Phone" type="tel" value={profileForm.phone ?? ""} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />

              <Button type="submit" className="w-full rounded-full bg-gradient-to-br from-soft-highlight to-green-accent text-bg-deep" disabled={savingProfile || loadingProfile}>
                {savingProfile ? "Saving profile..." : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-2xl">Trusted contacts</CardTitle>
            <CardDescription className="text-foreground/60">
              Add or edit the people who receive live location during SOS events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form className="space-y-4 rounded-3xl border border-white/10 bg-bg-deep/30 p-5" onSubmit={handleContactSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={contactForm.name} onChange={(value) => setContactForm((current) => ({ ...current, name: value }))} />
                <Field label="Phone" type="tel" value={contactForm.phone} onChange={(value) => setContactForm((current) => ({ ...current, phone: value }))} />
                <Field label="Email" type="email" value={contactForm.email} onChange={(value) => setContactForm((current) => ({ ...current, email: value }))} />
                <div className="space-y-2">
                  <Label className="text-sm text-foreground/75">Relationship</Label>
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-bg-deep/60 px-4 text-sm text-neutral-light outline-none focus:ring-2 focus:ring-soft-highlight/60"
                    value={contactForm.relationship}
                    onChange={(event) => setContactForm((current) => ({ ...current, relationship: event.target.value }))}
                  >
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="partner">Partner</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
                <input
                  type="checkbox"
                  checked={contactForm.is_primary}
                  onChange={(event) => setContactForm((current) => ({ ...current, is_primary: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-bg-deep text-soft-highlight focus:ring-soft-highlight/60"
                />
                Mark as primary contact
              </label>

              <div className="flex gap-3">
                <Button type="submit" className="rounded-full bg-gradient-to-br from-soft-highlight to-green-accent text-bg-deep" disabled={savingContact}>
                  {savingContact ? "Saving..." : contactForm.id ? "Update contact" : "Add contact"}
                </Button>
                <Button type="button" variant="outline" className="rounded-full border-white/10" onClick={resetContactForm}>
                  Clear
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-neutral-light">Saved contacts</div>
                <div className="text-xs text-foreground/45">{loadingContacts ? "Refreshing..." : `${contacts.length} saved`}</div>
              </div>

              <div className="grid gap-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-2xl border border-white/10 bg-bg-deep/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-neutral-light">{contact.name}</div>
                          {contact.is_primary && <span className="rounded-full bg-soft-highlight/15 px-2 py-0.5 text-[11px] text-soft-highlight">Primary</span>}
                        </div>
                        <div className="mt-1 text-xs text-foreground/55">{contact.relationship}</div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-foreground/65">
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
                          {contact.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!contact.is_primary && (
                          <Button type="button" size="sm" variant="outline" className="rounded-full border-white/10" onClick={() => void handlePrimary(contact)}>
                            Make primary
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" className="rounded-full border-white/10" onClick={() => beginEditContact(contact)}>
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="rounded-full border-white/10 text-red-300 hover:text-red-200" onClick={() => void handleDelete(contact)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!contacts.length && !loadingContacts && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-bg-deep/20 p-4 text-sm text-foreground/55">
                    No trusted contacts saved yet.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Field({
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-foreground/75">{label}</Label>
      <Input
        {...props}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-11 rounded-2xl border-white/10 bg-bg-deep/60 text-neutral-light placeholder:text-foreground/35 focus-visible:ring-soft-highlight/60"
      />
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-deep/35 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-highlight/75">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm text-neutral-light">{value}</div>
    </div>
  );
}
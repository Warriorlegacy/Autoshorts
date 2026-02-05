import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocialMedia } from '../../hooks/useSocialMedia';
import { LogOut, Youtube, Instagram, Settings as SettingsIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accounts, refreshAccounts, connectYouTube, disconnectPlatform, loading: socialLoading } = useSocialMedia();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState<'youtube' | 'instagram' | null>(null);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const platform = searchParams.get('platform');
    const error = searchParams.get('error');

    if (connected === 'true') {
      setMessage({
        type: 'success',
        text: `${platform === 'youtube' ? 'YouTube' : 'Instagram'} account connected successfully!`,
      });
      refreshAccounts();
      navigate('/settings', { replace: true });
    } else if (connected === 'false' && error) {
      setMessage({
        type: 'error',
        text: `Failed to connect ${platform}: ${decodeURIComponent(error)}`,
      });
      navigate('/settings', { replace: true });
    }
  }, [searchParams, navigate, refreshAccounts]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/');
    }
  };

  const handleConnect = async (platform: 'youtube' | 'instagram') => {
    setIsConnecting(platform);
    setMessage(null);

    try {
      if (platform === 'youtube') {
        await connectYouTube();
      } else {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/instagram/auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to initiate ${platform} connection. Please try again.`,
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (platform: 'youtube' | 'instagram') => {
    if (!confirm(`Disconnect your ${platform === 'youtube' ? 'YouTube' : 'Instagram'} account?`)) {
      return;
    }

    setIsConnecting(platform);
    try {
      const success = await disconnectPlatform(platform);
      if (success) {
        setMessage({
          type: 'success',
          text: `${platform === 'youtube' ? 'YouTube' : 'Instagram'} account disconnected.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to disconnect account.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred while disconnecting.',
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const getPlatformIcon = (platform: 'youtube' | 'instagram') => {
    return platform === 'youtube'
      ? <Youtube className="w-6 h-6 text-red-600" />
      : <Instagram className="w-6 h-6 text-pink-600" />;
  };

  const getPlatformName = (platform: 'youtube' | 'instagram') => {
    return platform === 'youtube' ? 'YouTube' : 'Instagram';
  };

  const getAccount = (platform: 'youtube' | 'instagram') => {
    return accounts.find(a => a.platform === platform);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message && (
          <div className={`mb-6 border rounded-lg p-4 flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Accounts</h2>
          <div className="space-y-4">
            {(['youtube', 'instagram'] as const).map((platform) => {
              const account = getAccount(platform);
              const isLoading = isConnecting === platform || (socialLoading && !account);

              return (
                <div key={platform} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(platform)}
                    <div>
                      <h3 className="font-medium text-gray-900">{getPlatformName(platform)}</h3>
                      <p className="text-sm text-gray-600">
                        {account?.isConnected ? (
                          <>
                            <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" />
                            Connected as {account.username || account.displayName}
                          </>
                        ) : (
                          'Not connected'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => account?.isConnected ? handleDisconnect(platform) : handleConnect(platform)}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      account?.isConnected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : account?.isConnected ? (
                      'Disconnect'
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            💡 Connect your social media accounts to automatically publish your videos to multiple platforms.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">Starter Plan</p>
              <p className="text-gray-600">Free plan • 10 credits/month</p>
            </div>
            <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium">
              Upgrade
            </button>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

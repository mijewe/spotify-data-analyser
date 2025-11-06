using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class DataReader : MonoBehaviour
{
    [Serializable]
    public class TrackListen
    {
        public DateTime ts;
        public string platform;
        public int ms_played;
        public string conn_country;
        public string ip_addr;
        public string master_metadata_track_name;
        public string master_metadata_album_artist_name;
        public string master_metadata_album_album_name;
        public string spotify_track_uri;
        public object episode_name;
        public object episode_show_name;
        public object spotify_episode_uri;
        public object audiobook_title;
        public object audiobook_uri;
        public object audiobook_chapter_uri;
        public object audiobook_chapter_title;
        public string reason_start;
        public string reason_end;
        public bool shuffle;
        public bool skipped;
        public bool offline;
        public object offline_timestamp;
        public bool incognito_mode;
    }
    
    [Serializable]
    public class RootObject
    {
        public TrackListen[] tracks;
    }
    
    public List<TextAsset> json = new List<TextAsset>();
    private List<TrackListen> listens = new List<TrackListen>();

    [SerializeField] private int processTracksPerFrame = 300;

	List<string> _artistNames = new List<string>();
    List<int> _artistPlaycounts = new List<int>();

    private int _tracksToProcess;
    private int _processingIndex;

    private float _payPerListenLow = 0.003f;
    private float _payPerListenHigh = 0.005f;

    private string _mostPlayedArtist;
    private int _mostPlayedArtistCount;

    private string _secondMostPlayedArtist;
    private int _secondMostPlayedArtistCount;
    
    private string _thirdMostPlayedArtist;
	private int _thirdMostPlayedArtistCount;
    
    private int _blankTracks;

    private int _estimatedYearsSubbed = 13;
    private float _paidPerMonth = 6.6f;
    
    private void Start()
    {
        foreach (TextAsset asset in json)
        {
            RootObject myObject = JsonUtility.FromJson<RootObject>("{\"tracks\":" + asset.text + "}");
            listens.AddRange(myObject.tracks);
        }

        _tracksToProcess = listens.Count;
        _processingIndex = 0;
        
        Debug.Log($"Processing {_tracksToProcess} tracks");
    }

    private void Update()
    {
	    if (_processingIndex < _tracksToProcess)
	    {
		    for (int i = 0; i < processTracksPerFrame; i++)
		    {
			    if (listens[_processingIndex].master_metadata_album_artist_name != "")
			    {
				    int artistIndex = _artistNames.IndexOf(listens[_processingIndex].master_metadata_album_artist_name);

				    if (artistIndex == -1)
				    {
					    _artistNames.Add(listens[_processingIndex].master_metadata_album_artist_name);
					    _artistPlaycounts.Add(1);

					    // Debug.Log("Add Artist " + listens[_processingIndex].master_metadata_album_artist_name);
				    }
				    else
				    {
					    _artistPlaycounts[artistIndex]++;
				    }
			    }
			    else
			    {
				    _blankTracks++;
			    }

			    _processingIndex++;
			    
			    if (_processingIndex >= _tracksToProcess)
			    {
				    Debug.Log("Done!");
				    CalculateCounts();
				    break;
			    }
			    
		    }
	    }
    }
    
    private void CalculateCounts()
    {
	    string data = "";

	    for (int i = 0; i < _artistNames.Count; i++)
		    data += _artistPlaycounts[i] + ": " + _artistNames[i] + "\n";
	    
		string path = "Assets/StreamingAssets/Data/artistData.txt";
		StreamWriter sr;
		sr = File.CreateText(path);
		sr.WriteLine(data);
		sr.Close();
		
		Debug.Log($"Money to artists over {(listens.Count - _blankTracks)} listens (low estimate $0.003 per listen): ${((listens.Count - _blankTracks) * _payPerListenLow):0.00}");
		Debug.Log($"Money to artists over {(listens.Count - _blankTracks)} listens (high estimate $0.005 per listen): ${((listens.Count - _blankTracks) * _payPerListenHigh):0.00}");

		int mostPlayedIndex = -1;
		for (int i = 0; i < _artistNames.Count; i++)
		{
			if (_artistPlaycounts[i] > _mostPlayedArtistCount)
			{
				_mostPlayedArtistCount = _artistPlaycounts[i];
				_mostPlayedArtist = _artistNames[i];
				mostPlayedIndex = i;
			}
		}
		
		int secondMostPlayedIndex = -1;
		for (int i = 0; i < _artistNames.Count; i++)
		{
			if (i == mostPlayedIndex) continue;
			
			if (_artistPlaycounts[i] > _secondMostPlayedArtistCount)
			{
				_secondMostPlayedArtistCount = _artistPlaycounts[i];
				_secondMostPlayedArtist = _artistNames[i];
				secondMostPlayedIndex = i;
			}
		}
		
		for (int i = 0; i < _artistNames.Count; i++)
		{
			if (i == mostPlayedIndex) continue;
			if (i == secondMostPlayedIndex) continue;
			
			if (_artistPlaycounts[i] > _thirdMostPlayedArtistCount)
			{
				_thirdMostPlayedArtistCount = _artistPlaycounts[i];
				_thirdMostPlayedArtist = _artistNames[i];
			}
		}

		Debug.Log($"Most played artist at {_mostPlayedArtistCount} plays: {_mostPlayedArtist}, paid ${(_mostPlayedArtistCount * _payPerListenLow):0.00} - ${(_mostPlayedArtistCount * _payPerListenHigh):0.00}");
		Debug.Log($"Second most played artist at {_secondMostPlayedArtistCount} plays: {_secondMostPlayedArtist}, paid ${(_secondMostPlayedArtistCount * _payPerListenLow):0.00} - ${(_secondMostPlayedArtistCount * _payPerListenHigh):0.00}");
		Debug.Log($"Third most played artist at {_thirdMostPlayedArtistCount} plays: {_thirdMostPlayedArtist}, paid ${(_thirdMostPlayedArtistCount * _payPerListenLow):0.00} - ${(_thirdMostPlayedArtistCount * _payPerListenHigh):0.00}");

		float averageListensPerArtist = (float)(listens.Count - _blankTracks) / _artistNames.Count;
		Debug.Log($"Average listens across {_artistNames.Count} artists: {averageListensPerArtist}, paying average ${(averageListensPerArtist * _payPerListenLow):0.00} - ${(averageListensPerArtist * _payPerListenHigh):0.00}");
		
		int monthsSubbed = _estimatedYearsSubbed * 12;
		float paidSpotify = _paidPerMonth * monthsSubbed;
		
		Debug.Log($"Paid Spotify roughly £{paidSpotify:0.00} at £6.60/month for 13 years.");

    }
}
